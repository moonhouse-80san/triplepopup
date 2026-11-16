<?php
/* 팝업 플레이 (triplepopup) v3.9.0 · 2026-11-15 · 플레이웹 playwebon.com */
class triplepopupView extends triplepopup
{
    function init() {}

    function getTriplepopupData()
    {
        $oModel = getModel('triplepopup');
        $this->add('config', $oModel->getFrontConfig());
        // 현재 페이지 정보: 주소 매개변수를 우선하고, 없으면 페이지 로드 시 기록된 쿠키(tp_page = 모듈번호|mid|게시글보기여부)를 사용
        $page = isset($_COOKIE['tp_page']) ? explode('|', (string)$_COOKIE['tp_page'], 3) : array();
        $mid  = Context::get('tp_mid') ?? (isset($page[1]) ? $page[1] : null);
        $isDocument = (bool)(int)(Context::get('tp_doc') ?? (isset($page[2]) ? $page[2] : 0));
        // 관리자 미리보기(tp_preview=1): 관리자 로그인 상태에서만 페이지·그룹 조건 없이 등록된 활성 배너를 모두 내려준다
        $logged  = Context::get('logged_info');
        $preview = Context::get('tp_preview') === '1' && $logged && $logged->is_admin === 'Y';
        $this->add('items',  $oModel->getPopupItemList((int)(Context::get('tp_srl') ?? (isset($page[0]) ? $page[0] : 0)), $mid === null ? null : (string)$mid, $isDocument, $preview, (string)Context::get('tp_cat')));
        Context::setResponseMethod('JSON');
    }
}
