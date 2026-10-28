<?php
class triplepopupController extends triplepopup
{
    function init() {}

    /**
     * moduleHandler.init (after) 트리거 — 프론트 페이지에 팝업 리소스를 주입
     */
    function triggerInjectPopup(&$oModule)
    {
        // 관리자/모듈 자체 요청에는 주입하지 않음
        if (Context::get('module') === 'admin') return;
        if (Context::get('module') === 'triplepopup') return;

        $oModel = getModel('triplepopup');
        $config = $oModel->getPopupConfig();
        if (!$config || $config->is_active !== 'Y') return;

        // 노출 대상 모듈(mid) 필터 — 대상이 지정되면 해당 페이지에서만, 미지정이면 전체 노출
        $target_mids = (isset($config->target_mids) && is_array($config->target_mids)) ? $config->target_mids : array();
        if (!empty($target_mids)) {
            $mid = (string)Context::get('mid');
            if ($mid === '' || !in_array($mid, $target_mids, true)) return;
        }

        $items = $oModel->getPopupItemList();
        if (empty($items)) return;

        $base = \RX_BASEURL . 'modules/triplepopup/';
        $path = _XE_PATH_ . 'modules/triplepopup/';
        $api  = \RX_BASEURL . 'index.php?module=triplepopup&act=getTriplepopupData';

        $cssv = @filemtime($path . 'tpl/css/popup.css');
        $jsv  = @filemtime($path . 'tpl/js/popup.js');

        Context::addHtmlHeader('<script>window.TRIPLEPOPUP_API = ' . json_encode($api) . ';</script>');
        Context::addCSSFile($base . 'tpl/css/popup.css' . ($cssv ? '?v=' . $cssv : ''));
        Context::addJsFile($base . 'tpl/js/popup.js' . ($jsv ? '?v=' . $jsv : ''), false, '', 'body');
    }
}
