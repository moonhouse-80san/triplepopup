<?php
class triplepopupView extends triplepopup
{
    function init() {}

    function getTriplepopupData()
    {
        $oModel = getModel('triplepopup');
        $this->add('config', $oModel->getPopupConfig());
        // 현재 페이지 정보: 주소 매개변수를 우선하고, 없으면 페이지 로드 시 기록된 쿠키(tp_page = 모듈번호|mid)를 사용
        $page = isset($_COOKIE['tp_page']) ? explode('|', (string)$_COOKIE['tp_page'], 2) : array();
        $mid  = Context::get('tp_mid') ?? (isset($page[1]) ? $page[1] : null);
        $this->add('items',  $oModel->getPopupItemList((int)(Context::get('tp_srl') ?? (isset($page[0]) ? $page[0] : 0)), $mid === null ? null : (string)$mid));
        Context::setResponseMethod('JSON');
    }
}
