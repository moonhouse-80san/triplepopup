<?php
class triplepopupAdminController extends triplepopup
{
    function init() {}

    /** YYYY-MM-DD(또는 숫자 혼합) -> YYYYMMDD, 유효하지 않으면 빈 문자열 */
    function _normalizeDate($value)
    {
        $digits = preg_replace('/[^0-9]/', '', (string)$value);
        return (strlen($digits) === 8) ? $digits : '';
    }

    /** 줄바꿈 정규화: CRLF/CR -> LF (엔터 입력을 단락 줄바꿈으로 저장) */
    function _normalizeText($value)
    {
        return str_replace(array("\r\n", "\r"), "\n", (string)$value);
    }

    /**
     * 다국어 텍스트 정규화.
     * 라이믹스 다국어 코드($user_lang->이름)는 코드 그대로 저장하고, 일반 텍스트는 줄바꿈만 정리한다.
     */
    function _normalizeLangText($value, $multiline = false)
    {
        $value = (string)$value;
        $trim  = trim($value);
        if (preg_match('/^\$user_lang-(?:>|&gt;|&amp;gt;)([a-zA-Z0-9_]+)$/', $trim, $m)) {
            return '$user_lang->' . $m[1];
        }
        if ($multiline) return $this->_normalizeText($value);
        return str_replace(array("\r\n", "\r", "\n"), ' ', $value);
    }

    /** 색상값 검증: #rgb / #rrggbb 형태의 HEX만 허용, 그 외엔 기본값 */
    function _normalizeColor($value, $fallback = '#0071e3')
    {
        $value = trim((string)$value);
        if (preg_match('/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value)) {
            return strtolower($value);
        }
        return $fallback;
    }

    /**
     * 링크 URL 검증. http(s)/mailto/tel 또는 사이트 내부 루트 상대경로(/path)만 허용.
     * javascript:, data:, vbscript: 등 스크립트 실행 가능 스킴과 프로토콜-상대(//host)는 차단.
     */
    function _normalizeUrl($value)
    {
        $value = trim((string)$value);
        if ($value === '') return '';
        if (preg_match('#^(https?://|mailto:|tel:)#i', $value)) return $value;
        if ($value[0] === '/' && substr($value, 0, 2) !== '//') return $value;
        return '';
    }

    /** 업로드 디렉터리 내부의 파일만 삭제 (경로 이탈 방지) */
    function _deleteUploadedImage($url)
    {
        if (!$url) return;
        $base = realpath(_XE_PATH_ . 'files/attach/triplepopup');
        $url  = (string)$url;
        // RX_BASEURL('/' 등)은 앞부분에서 한 번만 제거 (str_replace 는 모든 '/' 를 지워 경로가 깨짐)
        if (\RX_BASEURL !== '' && strpos($url, \RX_BASEURL) === 0) $url = substr($url, strlen(\RX_BASEURL));
        $rel  = ltrim($url, '/');
        $real = realpath(_XE_PATH_ . $rel);
        if ($base && $real && strpos($real, $base . DIRECTORY_SEPARATOR) === 0 && is_file($real)) {
            FileHandler::removeFile($real);
        }
    }

    /**
     * 저장/삭제 후 돌아갈 관리자 URL.
     * 사용자가 머물던 관리자 화면(referer)으로 되돌려 관리자 레이아웃(사이드바)을 유지한다.
     * referer 가 없거나 외부 도메인이면 기본 관리 화면으로 폴백.
     */
    function _getAdminReturnUrl()
    {
        $referer = isset($_SERVER['HTTP_REFERER']) ? (string)$_SERVER['HTTP_REFERER'] : '';
        if ($referer !== '' && strpos($referer, 'dispTriplepopupAdminIndex') !== false) {
            $ref_host  = (string)parse_url($referer, PHP_URL_HOST);
            $self_host = isset($_SERVER['HTTP_HOST']) ? (string)$_SERVER['HTTP_HOST'] : '';
            if ($ref_host === '' || $ref_host === $self_host) {
                return $referer;
            }
        }
        return getNotEncodedUrl('', 'module', 'triplepopup', 'act', 'dispTriplepopupAdminIndex');
    }

    /** 드래그로 변경된 배너 표시 순서를 config에 저장 (AJAX) */
    function procTriplepopupAdminSaveOrder()
    {
        $raw   = (string)Context::get('order');
        $order = array();
        foreach (explode(',', $raw) as $n) {
            $n = (int)trim($n);
            if ($n >= 1 && $n <= 6 && !in_array($n, $order, true)) {
                $order[] = $n;
            }
        }
        for ($i = 1; $i <= 6; $i++) {
            if (!in_array($i, $order, true)) $order[] = $i;
        }

        $oModuleModel = getModel('module');
        $config = $oModuleModel->getModuleConfig('triplepopup');
        if (!$config) $config = new stdClass();
        $config->slot_order = implode(',', $order);

        $oModuleController = getController('module');
        $oModuleController->updateModuleConfig('triplepopup', $config);

        $this->setMessage('순서가 변경되었습니다.');
    }

    /**
     * 노출 대상 mid 목록 정규화.
     * 실제 사이트에 존재하는 mid만 허용하고 중복을 제거한다. (없으면 빈 배열 = 전체 노출)
     */
    function _normalizeTargetMids($value)
    {
        if (!is_array($value)) return array();

        $oModuleModel = getModel('module');
        $mid_list = $oModuleModel->getMidList();
        $valid = array();
        if (is_array($mid_list)) {
            foreach ($mid_list as $mid => $info) { $valid[$mid] = true; }
        }

        $result = array();
        foreach ($value as $mid) {
            $mid = trim((string)$mid);
            if ($mid === '' || in_array($mid, $result, true)) continue;
            if (!empty($valid)) {
                if (isset($valid[$mid])) $result[] = $mid;
            } elseif (preg_match('/^[a-zA-Z0-9_-]+$/', $mid)) {
                $result[] = $mid;
            }
        }
        return $result;
    }

    function procTriplepopupAdminSaveConfig()
    {
        $oModuleModel = getModel('module');
        $config = $oModuleModel->getModuleConfig('triplepopup');
        if (!$config) $config = new stdClass();

        $config->slide_interval = max(1, (int)Context::get('slide_interval'));
        $config->is_active      = Context::get('is_active') === 'Y' ? 'Y' : 'N';
        // 카드 가로 폭: 180~900px (기본 420)
        $w = (int)Context::get('popup_width');
        if ($w < 180) $w = 180;
        if ($w > 900) $w = 900;
        $config->popup_width = $w;

        $oModuleController = getController('module');
        $oModuleController->updateModuleConfig('triplepopup', $config);

        $this->setMessage('저장되었습니다.');
        $this->setRedirectUrl($this->_getAdminReturnUrl());
    }

    /** 동작 모듈(노출 대상 mid) 설정 저장 — 미선택 시 전체 모듈에 노출 */
    function procTriplepopupAdminSaveModules()
    {
        $oModuleModel = getModel('module');
        $config = $oModuleModel->getModuleConfig('triplepopup');
        if (!$config) $config = new stdClass();

        $config->target_mids = $this->_normalizeTargetMids(Context::get('target_mids'));

        $oModuleController = getController('module');
        $oModuleController->updateModuleConfig('triplepopup', $config);

        $this->setMessage('저장되었습니다.');
        $this->setRedirectUrl($this->_getAdminReturnUrl());
    }

    /**
     * 업로드 1건 검증·저장. 성공 시 URL, 업로드가 없으면 null, 실패 시 BaseObject(에러)를 반환한다.
     */
    function _saveUploadedImage($name, $tmp, $size, $error, $prefix)
    {
        if ((string)$name === '' || (int)$error === UPLOAD_ERR_NO_FILE) return null;
        if ((int)$error !== UPLOAD_ERR_OK) {
            return new BaseObject(-1, '이미지 업로드에 실패했습니다.');
        }
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if (!in_array($ext, array('jpg', 'jpeg', 'png', 'gif', 'webp'))) {
            return new BaseObject(-1, '허용되지 않는 파일 형식입니다. (jpg, png, gif, webp)');
        }
        if ((int)$size > 5 * 1024 * 1024) {
            return new BaseObject(-1, '이미지 용량은 5MB 이하만 업로드할 수 있습니다.');
        }
        $info = @getimagesize($tmp);
        $allowedMime = array('image/jpeg', 'image/png', 'image/gif', 'image/webp');
        if ($info === false || !isset($info['mime']) || !in_array($info['mime'], $allowedMime, true)) {
            return new BaseObject(-1, '유효한 이미지 파일이 아닙니다.');
        }
        $upload_dir = _XE_PATH_ . 'files/attach/triplepopup/';
        FileHandler::makeDir($upload_dir);
        $filename = $prefix . '_' . time() . '_' . substr(md5(uniqid('', true)), 0, 6) . '.' . $ext;
        if (!move_uploaded_file($tmp, $upload_dir . $filename)) {
            return new BaseObject(-1, '이미지 업로드에 실패했습니다.');
        }
        return \RX_BASEURL . 'files/attach/triplepopup/' . $filename;
    }

    /** 언어별 이미지 업로드·삭제 처리 → 저장할 JSON 문자열 또는 BaseObject(에러) */
    function _processLangImages($slot_number, $existing)
    {
        $map    = $this->decodeLangImages($existing && isset($existing->body_images) ? $existing->body_images : '');
        $langs  = $this->getEnabledLangs();
        $delete = Context::get('body_image_lang_delete');
        $files  = isset($_FILES['body_image_lang']) ? $_FILES['body_image_lang'] : null;

        foreach ($langs as $code => $name) {
            // 삭제 체크
            if (is_array($delete) && !empty($delete[$code]) && isset($map[$code])) {
                $this->_deleteUploadedImage($map[$code]);
                unset($map[$code]);
            }
            // 새 업로드
            if ($files && isset($files['name'][$code])) {
                $url = $this->_saveUploadedImage($files['name'][$code], $files['tmp_name'][$code], $files['size'][$code], $files['error'][$code],
                    'slot' . $slot_number . '_' . preg_replace('/[^a-zA-Z-]/', '', $code));
                if ($url instanceof BaseObject) return $url;
                if ($url !== null) {
                    if (isset($map[$code])) $this->_deleteUploadedImage($map[$code]);
                    $map[$code] = $url;
                }
            }
        }
        return empty($map) ? '' : json_encode($map, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    function procTriplepopupAdminSaveItem()
    {
        $slot_number = (int)Context::get('slot_number');
        if ($slot_number < 1 || $slot_number > 6) {
            return $this->setError(-1, '잘못된 배너 번호입니다.');
        }

        // 이미지 위 HTML: 업로드 처리 전에 검증하여 실패 시 고아 파일이 남지 않게 한다.
        // HTMLFilter 로 script · 이벤트 속성 · javascript: 링크 등 XSS 요소를 제거한 값만 저장 (class 는 허용, 에디터 컴포넌트는 제외)
        $htmlContent = \Rhymix\Framework\Filters\HTMLFilter::clean(trim((string)Context::get('html_content')), true, false);
        if (strlen($htmlContent) > 20000) {
            return $this->setError(-1, '이미지 위 HTML 은 20,000바이트 이하로 입력해 주세요.');
        }

        $oModel   = getModel('triplepopup');
        $existing = $oModel->getPopupItem($slot_number);

        // 이미지 업로드 / 삭제 처리
        $body_image = $existing ? $existing->body_image : '';
        $new_uploaded = false;
        if (isset($_FILES['body_image'])) {
            $f   = $_FILES['body_image'];
            $url = $this->_saveUploadedImage($f['name'], $f['tmp_name'], $f['size'], $f['error'], 'slot' . $slot_number);
            if ($url instanceof BaseObject) return $this->setError(-1, $url->getMessage());
            if ($url !== null) {
                // 기존 이미지 삭제 (업로드 디렉터리 내부로 한정)
                $this->_deleteUploadedImage($body_image);
                $body_image = $url;
                $new_uploaded = true;
            }
        }
        // 새 업로드가 없고 삭제 체크 시 기존 이미지 제거
        if (!$new_uploaded && Context::get('body_image_delete') === 'Y' && $body_image) {
            $this->_deleteUploadedImage($body_image);
            $body_image = '';
        }

        // 언어별 이미지
        $body_images = $this->_processLangImages($slot_number, $existing);
        if ($body_images instanceof BaseObject) return $this->setError(-1, $body_images->getMessage());

        $args                  = new stdClass();
        $args->slot_number     = $slot_number;
        $args->badge_text      = $this->_normalizeLangText(Context::get('badge_text'));
        $args->badge_bg_color  = $this->_normalizeColor(Context::get('badge_bg_color'));
        $args->badge_text_color = $this->_normalizeColor(Context::get('badge_text_color'), '#ffffff');
        $args->body_image      = $body_image;
        $args->body_images     = $body_images;
        $args->title_text      = $this->_normalizeLangText(Context::get('title_text'), true);
        $args->sub_text        = $this->_normalizeLangText(Context::get('sub_text'), true);
        $args->html_content    = $htmlContent;
        $args->html_position   = (Context::get('html_position') === 'overlay') ? 'overlay' : 'top';
        $args->html_bg_color   = $this->_normalizeColor(Context::get('html_bg_color'), '#ffffff');
        $args->click_url       = $this->_normalizeUrl(Context::get('click_url'));
        $args->click_target    = (Context::get('click_target') === 'self') ? 'self' : 'blank';
        $args->footer_text     = $this->_normalizeLangText(Context::get('footer_text'));
        $args->footer_bg_color = $this->_normalizeColor(Context::get('footer_bg_color'));
        $args->footer_text_color = $this->_normalizeColor(Context::get('footer_text_color'), '#ffffff');
        $args->start_date      = $this->_normalizeDate(Context::get('start_date'));
        $args->end_date        = $this->_normalizeDate(Context::get('end_date'));
        $args->is_active       = Context::get('is_active') === 'Y' ? 'Y' : 'N';
        $args->regdate         = date('YmdHis');

        if ($existing) {
            $output = executeQuery('triplepopup.updatePopupItem', $args);
        } else {
            $output = executeQuery('triplepopup.insertPopupItem', $args);
        }
        if (!$output->toBool()) {
            return $this->setError(-1, '저장 중 오류가 발생했습니다: ' . $output->getMessage());
        }

        $this->setMessage('저장되었습니다.');
        $this->setRedirectUrl($this->_getAdminReturnUrl());
    }

    function procTriplepopupAdminDeleteItem()
    {
        $slot_number = (int)Context::get('slot_number');
        if ($slot_number < 1 || $slot_number > 6) {
            return $this->setError(-1, '잘못된 배너 번호입니다.');
        }

        $oModel   = getModel('triplepopup');
        $existing = $oModel->getPopupItem($slot_number);
        if ($existing && $existing->body_image) {
            $this->_deleteUploadedImage($existing->body_image);
        }
        if ($existing && !empty($existing->body_images)) {
            foreach ($this->decodeLangImages($existing->body_images) as $url) {
                $this->_deleteUploadedImage($url);
            }
        }

        $args              = new stdClass();
        $args->slot_number = $slot_number;
        $output            = executeQuery('triplepopup.deletePopupItem', $args);
        if (!$output->toBool()) {
            return $this->setError(-1, '삭제 중 오류가 발생했습니다: ' . $output->getMessage());
        }

        $this->setMessage('삭제되었습니다.');
        $this->setRedirectUrl($this->_getAdminReturnUrl());
    }
}
