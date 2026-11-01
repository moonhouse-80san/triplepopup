<?php
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

    function moduleInstall()
    {
        $oDB = DB::getInstance();
        $oDB->createTableByXmlFile(_XE_PATH_ . 'modules/triplepopup/schemas/triplepopup_slots.xml');
        $this->_registerTrigger();
        return new BaseObject();
    }

    /**
     * 테이블이나 트리거가 없으면 true 를 반환하여 라이믹스가 자동으로 업데이트를 수행하게 함.
     * (기존 '강제 설치' 버튼을 대체하는 자가 복구 로직)
     */
    function checkUpdate()
    {
        $oDB = DB::getInstance();
        if (!$oDB->isTableExists('triplepopup_slots')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'start_date')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'end_date')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'title_text')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'sub_text')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'badge_text_color')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'footer_text_color')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'click_target')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'body_images')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'html_content')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'html_position')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'html_bg_color')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'source_document_srl')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'html_bg_trans')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'body_preset')) {
            return true;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'target_groups')) {
            return true;
        }
        if (!$this->_isTriggerRegistered()) {
            return true;
        }
        return false;
    }

    function moduleUpdate()
    {
        $oDB = DB::getInstance();
        if (!$oDB->isTableExists('triplepopup_slots')) {
            $oDB->createTableByXmlFile(_XE_PATH_ . 'modules/triplepopup/schemas/triplepopup_slots.xml');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'start_date')) {
            $oDB->addColumn('triplepopup_slots', 'start_date', 'varchar', 8);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'end_date')) {
            $oDB->addColumn('triplepopup_slots', 'end_date', 'varchar', 8);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'title_text')) {
            $oDB->addColumn('triplepopup_slots', 'title_text', 'varchar', 200);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'sub_text')) {
            $oDB->addColumn('triplepopup_slots', 'sub_text', 'varchar', 300);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'badge_text_color')) {
            $oDB->addColumn('triplepopup_slots', 'badge_text_color', 'varchar', 20, '#ffffff');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'footer_text_color')) {
            $oDB->addColumn('triplepopup_slots', 'footer_text_color', 'varchar', 20, '#ffffff');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'click_target')) {
            $oDB->addColumn('triplepopup_slots', 'click_target', 'varchar', 10, 'blank');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'body_images')) {
            $oDB->addColumn('triplepopup_slots', 'body_images', 'text');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'html_content')) {
            $oDB->addColumn('triplepopup_slots', 'html_content', 'text');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'html_position')) {
            $oDB->addColumn('triplepopup_slots', 'html_position', 'varchar', 10, 'top');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'html_bg_color')) {
            $oDB->addColumn('triplepopup_slots', 'html_bg_color', 'varchar', 20, '#ffffff');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'source_document_srl')) {
            $oDB->addColumn('triplepopup_slots', 'source_document_srl', 'bigint', 11);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'html_bg_trans')) {
            $oDB->addColumn('triplepopup_slots', 'html_bg_trans', 'tinyint', 3, 0);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'body_preset')) {
            $oDB->addColumn('triplepopup_slots', 'body_preset', 'tinyint', 1, 0);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'target_groups')) {
            $oDB->addColumn('triplepopup_slots', 'target_groups', 'text');
        }
        if (!$this->_isTriggerRegistered()) {
            $this->_registerTrigger();
        }
        return new BaseObject();
    }

    function moduleUninstall()
    {
        $oModuleController = getController('module');
        $oModuleController->deleteTrigger(self::TRIGGER_EVENT, 'triplepopup', 'controller', self::TRIGGER_METHOD, self::TRIGGER_WHEN);
        return new BaseObject();
    }

    /**
     * 테이블/날짜 컬럼이 없으면 즉시 생성·추가하는 안전장치.
     * 관리자 페이지 진입 시 호출하여, 모듈 업데이트를 별도로 실행하지 않아도 스키마가 보강되도록 한다.
     */
    function ensureSchema()
    {
        $oDB = DB::getInstance();
        if (!$oDB->isTableExists('triplepopup_slots')) {
            $oDB->createTableByXmlFile(_XE_PATH_ . 'modules/triplepopup/schemas/triplepopup_slots.xml');
            return;
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'start_date')) {
            $oDB->addColumn('triplepopup_slots', 'start_date', 'varchar', 8);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'end_date')) {
            $oDB->addColumn('triplepopup_slots', 'end_date', 'varchar', 8);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'title_text')) {
            $oDB->addColumn('triplepopup_slots', 'title_text', 'varchar', 200);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'sub_text')) {
            $oDB->addColumn('triplepopup_slots', 'sub_text', 'varchar', 300);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'badge_text_color')) {
            $oDB->addColumn('triplepopup_slots', 'badge_text_color', 'varchar', 20, '#ffffff');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'footer_text_color')) {
            $oDB->addColumn('triplepopup_slots', 'footer_text_color', 'varchar', 20, '#ffffff');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'click_target')) {
            $oDB->addColumn('triplepopup_slots', 'click_target', 'varchar', 10, 'blank');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'body_images')) {
            $oDB->addColumn('triplepopup_slots', 'body_images', 'text');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'html_content')) {
            $oDB->addColumn('triplepopup_slots', 'html_content', 'text');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'html_position')) {
            $oDB->addColumn('triplepopup_slots', 'html_position', 'varchar', 10, 'top');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'html_bg_color')) {
            $oDB->addColumn('triplepopup_slots', 'html_bg_color', 'varchar', 20, '#ffffff');
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'source_document_srl')) {
            $oDB->addColumn('triplepopup_slots', 'source_document_srl', 'bigint', 11);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'html_bg_trans')) {
            $oDB->addColumn('triplepopup_slots', 'html_bg_trans', 'tinyint', 3, 0);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'body_preset')) {
            $oDB->addColumn('triplepopup_slots', 'body_preset', 'tinyint', 1, 0);
        }
        if (!$oDB->isColumnExists('triplepopup_slots', 'target_groups')) {
            $oDB->addColumn('triplepopup_slots', 'target_groups', 'text');
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

    /** 언어별 이미지 맵(JSON) → 배열. 사용 중인 언어 코드만 남긴다. */
    // 기본 배경이미지(1~6) 주소
    function getPresetImageUrl($no)
    {
        return \RX_BASEURL . 'modules/triplepopup/tpl/img/bg/background_' . (int)$no . '.jpg';
    }

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
