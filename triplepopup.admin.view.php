<?php
class triplepopupAdminView extends triplepopup
{
    function init()
    {
        $this->setTemplatePath($this->module_path . 'tpl/admin');
        $base = \RX_BASEURL . 'modules/triplepopup/';
        $path = _XE_PATH_ . 'modules/triplepopup/';
        $this->refreshTemplateCache();
        // 캐시 키는 숫자만 사용 (점이 들어가면 라이믹스가 파일 확장자를 잘못 인식해 CSS/JS가 로드되지 않음)
        $ver  = preg_replace('/[^0-9]/', '', $this->getModuleVersion());
        $cssv = $ver . (int)@filemtime($path . 'tpl/css/admin.css');
        $jsv  = $ver . (int)@filemtime($path . 'tpl/admin/admin.js');
        Context::addCSSFile($base . 'tpl/css/admin.css' . ($cssv ? '?v=' . $cssv : ''));
        Context::addJsFile($base . 'tpl/admin/admin.js' . ($jsv ? '?v=' . $jsv : ''), false, '', 'body');
    }

    function dispTriplepopupAdminIndex()
    {
        $this->ensureSchema();
        $oModel = getModel('triplepopup');
        Context::set('config', $oModel->getPopupConfig());
        $slots = $oModel->getSlotList();
        // 슬롯별 라이믹스 에디터 (에디터 컴포넌트 포함) — 입력값은 폼의 html_content 필드와 자동 동기화됨
        $oEditorModel = getModel('editor');
        foreach ($slots as $slot) {
            $option = new stdClass();
            $option->editor_skin = 'ckeditor';
            $option->height = 200;
            $option->primary_key_name = 'slot_number';
            $option->content_key_name = 'html_content';
            $option->allow_fileupload = false;
            $option->enable_autosave = false;
            $option->enable_component = true;
            $option->enable_default_component = true;
            $option->editor_toolbar_hide = true; // 도구 상자는 처음에 접힌 상태
            $slot->editor_html = $oEditorModel->getEditor(0, $option);
        }
        Context::set('slots', $slots);
        Context::set('modules', $oModel->getTargetModuleList());

        // 하단 '모듈 정보' 카드용 — conf/info.xml 에서 읽어옴
        Context::set('moduleInfo', $this->getModuleInfo());

        $this->setTemplateFile('index');
    }

    /**
     * 모듈 버전이 바뀌면(파일 덮어쓰기 업데이트) 이 모듈의 컴파일된 템플릿 캐시를 지운다.
     * 압축 해제 시 파일 수정 시각이 예전 값으로 유지되면 라이믹스가 옛 템플릿 캐시를 계속 쓰는 문제를 막는다.
     */
    private function refreshTemplateCache()
    {
        $ver = $this->getModuleVersion();
        $oModuleModel = getModel('module');
        $config = $oModuleModel->getModuleConfig('triplepopup');
        if (!$config) $config = new stdClass();
        if (isset($config->cached_version) && $config->cached_version === $ver) return;

        $dirs = array(
            _XE_PATH_ . 'files/cache/template/modules/triplepopup',
            _XE_PATH_ . 'files/cache/template_compiled/modules/triplepopup',
        );
        foreach ($dirs as $dir) {
            if (is_dir($dir)) FileHandler::removeDir($dir);
        }
        foreach (glob(_XE_PATH_ . 'files/cache/template_compiled/*triplepopup*') ?: array() as $f) {
            if (is_file($f)) @unlink($f);
        }

        $config->cached_version = $ver;
        getController('module')->updateModuleConfig('triplepopup', $config);
    }

    /** conf/info.xml 의 버전 문자열 */
    private function getModuleVersion()
    {
        static $ver = null;
        if ($ver === null) {
            $ver = '0';
            $raw = @file_get_contents(_XE_PATH_ . 'modules/triplepopup/conf/info.xml');
            $xml = $raw ? @simplexml_load_string($raw) : false;
            if ($xml && trim((string)$xml->version) !== '') $ver = trim((string)$xml->version);
        }
        return $ver;
    }

    /**
     * conf/info.xml 을 읽어 모듈 정보 객체를 만든다.
     * 파일이 없거나 파싱에 실패하면 기본값을 그대로 반환한다.
     */
    private function getModuleInfo()
    {
        $out = new stdClass();
        $out->title   = '트리플 팝업';
        $out->version = '3.2.1';
        $out->author  = '플레이웹';
        $out->email   = 'hello@playwebon.com';
        $out->link    = 'https://playwebon.com';
        $out->license = 'LGPL v2';

        $file = _XE_PATH_ . 'modules/triplepopup/conf/info.xml';
        if (!file_exists($file)) {
            return $out;
        }

        $prev = libxml_use_internal_errors(true);
        // 라이믹스는 libxml 외부 파일 로딩을 막아 두므로 simplexml_load_file 대신 문자열로 읽는다
        $raw  = @file_get_contents($file);
        $xml  = $raw ? simplexml_load_string($raw) : false;
        libxml_clear_errors();
        libxml_use_internal_errors($prev);
        if (!$xml) {
            return $out;
        }

        $pick = function ($node, $fallback) {
            $v = trim((string)$node);
            return $v !== '' ? $v : $fallback;
        };

        $out->title   = $pick($xml->title, $out->title);
        $out->version = $pick($xml->version, $out->version);
        $out->license = $pick($xml->license, $out->license);

        if (isset($xml->author)) {
            $attr = $xml->author->attributes();
            $out->author = $pick($xml->author->name, $out->author);
            if (isset($attr['email_address'])) {
                $out->email = $pick($attr['email_address'], $out->email);
            }
            if (isset($attr['link'])) {
                $out->link = $pick($attr['link'], $out->link);
            }
        }

        return $out;
    }
}
