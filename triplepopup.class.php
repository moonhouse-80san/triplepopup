<?php
/* 팝업 플레이 (triplepopup) v3.9.0 · 2026-11-15 · 플레이웹 playwebon.com */
/**
 * 팝업 관리 모듈
 * - moduleHandler.init(after) 트리거로 프론트 페이지에 레이어 팝업을 주입
 * - 설치/업데이트 시 테이블·트리거를 자동으로 점검하여 복구(별도 강제설치 불필요)
 */
class triplepopup extends ModuleObject
{
    const TRIGGER_EVENT  = 'moduleHandler.init';
    const TRIGGER_METHOD = 'triggerInjectPopup';
    const TRIGGER_WHEN   = 'after';

    const TABLE        = 'triplepopup_slots';
    const EFFECT_COUNT = 20;

    /** 스키마 XML 이후에 추가된 컬럼 (이름 => [타입, 크기, 기본값]) — 업데이트 시 없는 컬럼만 자동 추가 */
    private static $extra_columns = array(
        'start_date'          => array('varchar', 8, null),
        'end_date'            => array('varchar', 8, null),
        'title_text'          => array('varchar', 200, null),
        'sub_text'            => array('varchar', 300, null),
        'badge_text_color'    => array('varchar', 20, '#ffffff'),
        'footer_text_color'   => array('varchar', 20, '#ffffff'),
        'click_target'        => array('varchar', 10, 'blank'),
        'body_images'         => array('text', '', null),
        'html_content'        => array('text', '', null),
        'html_contents'       => array('text', '', null),
        'html_position'       => array('varchar', 10, 'top'),
        'html_bg_color'       => array('varchar', 20, '#ffffff'),
        'source_document_srl' => array('bigint', 11, null),
        'html_bg_trans'       => array('tinyint', 3, 0),
        'body_preset'         => array('tinyint', 1, 0),
        'target_groups'       => array('text', '', null),
        'border_width'        => array('tinyint', 3, 0),
        'auto_close_sec'      => array('varchar', 6, ''),
        'border_color'        => array('varchar', 20, '#ffaa56'),
        'card_shadow'         => array('char', 1, 'N'),
        'overlay_dim'         => array('tinyint', 3, 42),
        'target_modules'      => array('text', '', null),
        'target_categories'   => array('text', '', null),
        'footer_login'        => array('char', 1, 'N'),
        'footer_sns'          => array('char', 1, 'N'),
        'hide_on_document'    => array('char', 1, 'N'),
        'hide_buttons'        => array('char', 1, 'N'),
        'media_type'          => array('varchar', 10, 'image'),
        'youtube_url'         => array('varchar', 300, null),
        'youtube_options'     => array('text', '', null),
    );

    function moduleInstall()
    {
        $this->ensureSchema();
        $this->_registerTrigger();
        return new BaseObject();
    }

    /**
     * 테이블, 컬럼, 트리거 중 하나라도 없으면 true 를 반환하여 라이믹스가 자동으로 업데이트를 수행하게 함.
     * (기존 '강제 설치' 버튼을 대체하는 자가 복구 로직)
     */
    function checkUpdate()
    {
        $oDB = DB::getInstance();
        if (!$oDB->isTableExists(self::TABLE)) return true;
        foreach (self::$extra_columns as $name => $def) {
            if (!$oDB->isColumnExists(self::TABLE, $name)) return true;
        }
        return !$this->_isTriggerRegistered();
    }

    function moduleUpdate()
    {
        $this->ensureSchema();
        if (!$this->_isTriggerRegistered()) $this->_registerTrigger();
        return new BaseObject();
    }

    function moduleUninstall()
    {
        $oModuleController = getController('module');
        $oModuleController->deleteTrigger(self::TRIGGER_EVENT, 'triplepopup', 'controller', self::TRIGGER_METHOD, self::TRIGGER_WHEN);
        return new BaseObject();
    }

    /**
     * 테이블/컬럼이 없으면 즉시 생성·추가하는 안전장치.
     * 관리자 페이지 진입 시 호출하여, 모듈 업데이트를 별도로 실행하지 않아도 스키마가 보강되도록 한다.
     */
    function ensureSchema()
    {
        $oDB = DB::getInstance();
        if (!$oDB->isTableExists(self::TABLE)) {
            $oDB->createTableByXmlFile(_XE_PATH_ . 'modules/triplepopup/schemas/triplepopup_slots.xml');
            return;
        }
        foreach (self::$extra_columns as $name => $def) {
            if (!$oDB->isColumnExists(self::TABLE, $name)) {
                $oDB->addColumn(self::TABLE, $name, $def[0], $def[1], $def[2]);
            }
        }
    }

    function _isTriggerRegistered()
    {
        $oModuleModel = getModel('module');
        $trigger = $oModuleModel->getTrigger(self::TRIGGER_EVENT, 'triplepopup', 'controller', self::TRIGGER_METHOD, self::TRIGGER_WHEN);
        return !empty($trigger);
    }

    function _registerTrigger()
    {
        $oModuleController = getController('module');
        // 중복 방지를 위해 한 번 제거 후 등록
        $oModuleController->deleteTrigger(self::TRIGGER_EVENT, 'triplepopup', 'controller', self::TRIGGER_METHOD, self::TRIGGER_WHEN);
        $oModuleController->insertTrigger(self::TRIGGER_EVENT, 'triplepopup', 'controller', self::TRIGGER_METHOD, self::TRIGGER_WHEN);
    }

    /**
     * 라이믹스 사용자 정의 다국어 코드($user_lang->xxx)를 현재 언어 값으로 치환.
     * 다국어 코드가 없는 일반 텍스트는 그대로 반환한다.
     */
    function resolveLangText($value)
    {
        $value = (string)$value;
        if ($value === '' || strpos($value, '$user_lang->') === false) {
            return $value;
        }
        $out = $value;
        try {
            if (method_exists('Context', 'replaceUserLang')) {
                $out = Context::replaceUserLang($value);
            } else {
                $oModuleController = getController('module');
                if ($oModuleController && method_exists($oModuleController, 'replaceDefinedLangCode')) {
                    $oModuleController->replaceDefinedLangCode($out);
                }
            }
        } catch (\Throwable $e) {
            $out = $value;
        }
        // 치환되지 못한 코드(삭제된 다국어 등)는 화면에 코드명이 보이지 않도록 비운다
        $out = preg_replace('/\$user_lang-(?:>|&gt;)[a-zA-Z0-9_]+/', '', (string)$out);
        if (preg_match('/^userLang[0-9]+$/', trim($out))) $out = '';
        // 다국어 값은 HTML 이스케이프되어 저장될 수 있으므로 일반 텍스트로 복원 (출력은 textContent)
        $out = html_entity_decode((string)$out, ENT_QUOTES, 'UTF-8');
        return str_replace(array("\r\n", "\r"), "\n", $out);
    }

    /** 사이트에서 사용 중인 언어 목록 (코드 => 이름) */
    function getEnabledLangs()
    {
        $langs = Context::loadLangSelected();
        return is_array($langs) ? $langs : array();
    }

    /** 기본 배경이미지(1~6) 주소 */
    function getPresetImageUrl($no)
    {
        return \RX_BASEURL . 'modules/triplepopup/tpl/img/bg/background_' . (int)$no . '.jpg';
    }

    /** 언어별 이미지 맵(JSON) → 배열. 사용 중인 언어 코드만 남긴다. */
    function decodeLangImages($json)
    {
        $map = json_decode((string)$json, true);
        if (!is_array($map)) return array();
        $langs  = $this->getEnabledLangs();
        $result = array();
        foreach ($map as $code => $url) {
            $code = (string)$code; $url = (string)$url;
            if ($url === '' || !preg_match('/^[a-zA-Z-]+$/', $code)) continue;
            if (!empty($langs) && !isset($langs[$code])) continue;
            $result[$code] = $url;
        }
        return $result;
    }

    /** 선택 가능한 팝업 비율 (auto = 이미지 원본 비율 그대로) */
    function getRatioList()
    {
        return array('1:1', '3:4', '4:5', '2:3', '7:8', '4:3', '3:2', '2:1', '16:9', '9:16', 'auto');
    }

    /** 유튜브 주소(일반·쇼츠·공유·임베드)에서 영상 ID 와 쇼츠 여부를 추출. 형식이 맞지 않으면 null */
    function parseYoutubeUrl($url)
    {
        $url = trim((string)$url);
        if ($url === '') return null;
        if (!preg_match('~^https?://(?:[a-z0-9-]+\.)?(?:youtu\.be/|youtube(?:-nocookie)?\.com/(?:watch\?(?:.*&)?v=|shorts/|embed/|live/|v/))([A-Za-z0-9_-]{11})~i', $url, $m)) {
            return null;
        }
        $info = new stdClass();
        $info->id     = $m[1];
        $info->shorts = (stripos($url, '/shorts/') !== false);
        return $info;
    }

    /** 유튜브 재생 옵션 기본값 (Y/N) */
    function getYoutubeOptionDefaults()
    {
        return array(
            'autoplay'    => 'Y',
            'mute'        => 'Y',
            'loop'        => 'N',
            'controls'    => 'Y',
            'cover'       => 'N',
            'pause_slide' => 'Y',
        );
    }

    /** 저장된 유튜브 재생 옵션(JSON) → 객체 (자동 재생이면 음소거 강제) */
    function decodeYoutubeOptions($json)
    {
        $data = json_decode((string)$json, true);
        if (!is_array($data)) $data = array();
        $out = new stdClass();
        foreach ($this->getYoutubeOptionDefaults() as $key => $default) {
            $out->{$key} = isset($data[$key]) ? ($data[$key] === 'Y' ? 'Y' : 'N') : $default;
        }
        $out->start = isset($data['start']) ? max(0, min(86400, (int)$data['start'])) : 0;
        // 가로 폭(px): 0 = 지정 안 함 (모듈 설정 '팝업 가로 크기'·기본 폭을 따름)
        $out->width = (isset($data['width']) && (int)$data['width'] > 0) ? max(180, min(1600, (int)$data['width'])) : 0;
        if ($out->autoplay === 'Y') $out->mute = 'Y';
        return $out;
    }

    /** 다국어 적용 대상 텍스트 필드 */
    function getLangFields()
    {
        return array('badge_text', 'title_text', 'sub_text', 'footer_text');
    }

    function init()
    {
        return new BaseObject();
    }
}
