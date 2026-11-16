<?php
/* 팝업 플레이 (triplepopup) v3.9.0 · 2026-11-15 · 플레이웹 playwebon.com */
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

        // 현재 페이지의 모듈 번호·mid (이 트리거의 인자는 현재 모듈 정보) — 배너별 '노출 모듈'과 동작 모듈설정(대상 mid) 판단에 사용
        $moduleSrl = (int)(isset($oModule->module_srl) ? $oModule->module_srl : 0);
        $mid       = (string)Context::get('mid');
        // 게시글(내용글) 화면 여부 — 배너별 '게시글 보기 화면에서는 출력 안 함' 판단에 사용
        // 글 보기뿐 아니라 글 쓰기·수정·삭제, 댓글 쓰기·수정·삭제, 게시판 설정 등 관리 화면(act 이름에 Admin 포함: dispBoardAdminBoardInfo 등),
        // 문서·댓글 모듈 화면(게시글 관리 dispDocumentManageDocument 등), 검색 결과 화면(검색어 search_keyword 가 있는 목록)도 포함한다
        $isDocument = (int)Context::get('document_srl') > 0
            || trim((string)Context::get('search_keyword')) !== ''
            || preg_match('/^dispBoard(Write|Delete|WriteComment|ReplyComment|ModifyComment|DeleteComment)|^disp[A-Za-z]*Admin|^disp(Document|Comment)/', (string)Context::get('act')) === 1;

        $items = $oModel->getPopupItemList($moduleSrl, $mid, $isDocument);
        if (empty($items)) return;

        // 팝업 데이터 요청(AJAX)이 주소의 매개변수 없이 오더라도 현재 페이지를 알 수 있도록 쿠키에도 기록
        setcookie('tp_page', $moduleSrl . '|' . $mid . '|' . (int)$isDocument, array('path' => '/', 'samesite' => 'Lax'));

        $base = \RX_BASEURL . 'modules/triplepopup/';
        $path = _XE_PATH_ . 'modules/triplepopup/';
        $api  = \RX_BASEURL . 'index.php?module=triplepopup&act=getTriplepopupData&tp_srl=' . $moduleSrl . '&tp_mid=' . rawurlencode($mid) . '&tp_doc=' . (int)$isDocument;

        $cssv = @filemtime($path . 'tpl/css/popup.css');
        $jsv  = @filemtime($path . 'tpl/js/popup.js');

        Context::addHtmlHeader('<script>window.TRIPLEPOPUP_API = ' . json_encode($api) . ';</script>');
        Context::addCSSFile($base . 'tpl/css/popup.css' . ($cssv ? '?v=' . $cssv : ''));
        Context::addJsFile($base . 'tpl/js/popup.js' . ($jsv ? '?v=' . $jsv : ''), false, '', 'body');
    }
}
