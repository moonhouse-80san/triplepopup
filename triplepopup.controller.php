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
        // 글 쓰기·수정·삭제, 댓글 쓰기·수정·삭제, 검색 결과, 게시판 설정·게시글 관리 등 관리 화면에서는 옵션 없이 항상 팝업을 출력하지 않는다
        // (act 이름에 Admin 포함 / 문서·댓글 모듈 화면 / 검색어 search_keyword 가 있는 목록)
        if (trim((string)Context::get('search_keyword')) !== ''
            || preg_match('/^dispBoard(Write|Delete|WriteComment|ReplyComment|ModifyComment|DeleteComment)|^disp[A-Za-z]*Admin|^disp(Document|Comment)/', (string)Context::get('act')) === 1) {
            return;
        }

        // 게시글 보기 화면 여부 — 배너별 '게시글 보기 화면에서는 출력 안 함' 옵션 판단에 사용
        $isDocument = (int)Context::get('document_srl') > 0;

        // 카테고리 안에 들어온 경우(카테고리 목록 또는 그 카테고리의 글)의 카테고리 이름 — 배너별 '카테고리' 옵션 판단에 사용
        $oDocumentModel = getModel('document');
        $categorySrl = (int)Context::get('category');
        if ($categorySrl < 1 && $isDocument) {
            $categorySrl = (int)$oDocumentModel->getDocument((int)Context::get('document_srl'), false, false)->get('category_srl');
        }
        $categoryList  = $categorySrl > 0 ? (array)$oDocumentModel->getCategoryList($moduleSrl) : array();
        $categoryTitle = isset($categoryList[$categorySrl]) ? $oModel->resolveLangText($categoryList[$categorySrl]->title) : '';

        $items = $oModel->getPopupItemList($moduleSrl, $mid, $isDocument, false, $categoryTitle);
        if (empty($items)) return;

        // 팝업 데이터 요청(AJAX)이 주소의 매개변수 없이 오더라도 현재 페이지를 알 수 있도록 쿠키에도 기록
        setcookie('tp_page', $moduleSrl . '|' . $mid . '|' . (int)$isDocument, array('path' => '/', 'samesite' => 'Lax'));

        $base = \RX_BASEURL . 'modules/triplepopup/';
        $path = _XE_PATH_ . 'modules/triplepopup/';
        $api  = \RX_BASEURL . 'index.php?module=triplepopup&act=getTriplepopupData&tp_srl=' . $moduleSrl . '&tp_mid=' . rawurlencode($mid) . '&tp_doc=' . (int)$isDocument . '&tp_cat=' . rawurlencode($categoryTitle);

        $cssv = @filemtime($path . 'tpl/css/popup.css');
        $jsv  = @filemtime($path . 'tpl/js/popup.js');

        Context::addHtmlHeader('<script>window.TRIPLEPOPUP_API = ' . json_encode($api) . ';</script>');
        Context::addCSSFile($base . 'tpl/css/popup.css' . ($cssv ? '?v=' . $cssv : ''));
        Context::addJsFile($base . 'tpl/js/popup.js' . ($jsv ? '?v=' . $jsv : ''), false, '', 'body');
    }
}
