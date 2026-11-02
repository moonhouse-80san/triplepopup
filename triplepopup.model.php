<?php
class triplepopupModel extends triplepopup
{
    function init() {}

    function getPopupConfig()
    {
        $oModuleModel = getModel('module');
        $config = $oModuleModel->getModuleConfig('triplepopup');
        if (!$config) $config = new stdClass();
        if (empty($config->slide_interval)) $config->slide_interval = 3;
        if (empty($config->is_active))      $config->is_active = 'Y';
        if (empty($config->slot_order))      $config->slot_order = '1,2,3,4,5,6';
        if (empty($config->popup_width))     $config->popup_width = 420;
        if (empty($config->close_days))      $config->close_days = 1;
        if (!isset($config->target_mids) || !is_array($config->target_mids)) $config->target_mids = array();
        if (!in_array($config->module_sort ?? '', array('title', 'mid', 'created'), true)) $config->module_sort = 'title';
        return $config;
    }

    /**
     * 사이트의 기본(메인) 모듈 mid. 현재 사이트 정보 → 기본 사이트 정보 순으로 조회.
     */
    function _getDefaultMid()
    {
        $info = Context::get('site_module_info');
        if ($info && isset($info->mid) && (string)$info->mid !== '') {
            return (string)$info->mid;
        }
        $oModuleModel = getModel('module');
        if (method_exists($oModuleModel, 'getSiteInfo')) {
            $site = $oModuleModel->getSiteInfo(0);
            if ($site && isset($site->mid) && (string)$site->mid !== '') {
                return (string)$site->mid;
            }
        }
        return '';
    }

    /**
     * 사이트의 전체 모듈(mid) 목록을 팝업 노출 대상 선택용으로 반환.
     * 각 항목: mid, module(타입), module_type(대문자), title(표시명), checked(현재 선택 여부), is_main(메인 여부)
     * 정렬: 메인 모듈을 항상 첫 번째에 두고, 나머지는 설정(module_sort)에 따라 제목순/이름순(mid)/생성순.
     */
    function getTargetModuleList()
    {
        $config   = $this->getPopupConfig();
        $selected = array();
        foreach ((array)$config->target_mids as $m) { $selected[(string)$m] = true; }

        $default_mid  = $this->_getDefaultMid();
        $oModuleModel = getModel('module');
        $mid_list = $oModuleModel->getMidList();

        $list = array();
        if (is_array($mid_list)) {
            foreach ($mid_list as $mid => $info) {
                $row = new stdClass();
                $row->mid         = (string)$mid;
                $row->module_srl  = isset($info->module_srl) ? (int)$info->module_srl : 0;
                $row->module      = isset($info->module) ? (string)$info->module : '';
                $row->module_type = strtoupper($row->module);
                $title = (isset($info->browser_title) && trim((string)$info->browser_title) !== '')
                    ? trim((string)$info->browser_title) : '';
                $row->title   = ($title !== '') ? $title : $row->mid;
                $row->checked = isset($selected[$row->mid]);
                $row->is_main = ($default_mid !== '' && $row->mid === $default_mid);
                $list[] = $row;
            }
        }

        // 메인 모듈을 항상 맨 앞에, 그 외는 설정한 기준(제목순·이름순·생성순)으로 정렬
        $sort = $config->module_sort;
        usort($list, function ($a, $b) use ($sort) {
            if ($a->is_main !== $b->is_main) return $a->is_main ? -1 : 1;
            if ($sort === 'mid') return strcasecmp($a->mid, $b->mid);
            if ($sort === 'created') return $a->module_srl - $b->module_srl;
            return strcasecmp($a->title, $b->title);
        });
        return $list;
    }

    /**
     * 배너 표시 순서. config에 저장된 slot_number 순서를 1~6의 유효한 순열로 정규화하여 반환.
     */
    function getSlotOrder()
    {
        $config = $this->getPopupConfig();
        $raw    = isset($config->slot_order) ? (string)$config->slot_order : '';
        $order  = array();
        foreach (explode(',', $raw) as $n) {
            $n = (int)trim($n);
            if ($n >= 1 && $n <= 6 && !in_array($n, $order, true)) {
                $order[] = $n;
            }
        }
        // 누락된 번호는 뒤에 채워 항상 1~6 전체를 포함
        for ($i = 1; $i <= 6; $i++) {
            if (!in_array($i, $order, true)) $order[] = $i;
        }
        return $order;
    }

    function getPopupItemList()
    {
        $args = new stdClass();
        $args->is_active = 'Y';
        $output = executeQueryArray('triplepopup.getPopupItemList', $args);
        if (!$output->toBool()) return array();
        $items = $output->data ?: array();

        // 노출 기간 필터: 시작일 이전이거나 종료일이 지난 항목은 제외 (자동 비노출)
        $today  = date('Ymd');
        $filtered = array();

        // 현재 방문자의 회원그룹: 로그인 회원은 소속 그룹(group_srl), 비로그인은 'guest'
        $memberSrl    = \Rhymix\Framework\Session::getMemberSrl();
        $viewerGroups = $memberSrl ? array_map('strval', array_keys(\MemberModel::getMemberGroups($memberSrl))) : array('guest');

        foreach ($items as $item) {
            $start = isset($item->start_date) ? (string)$item->start_date : '';
            $end   = isset($item->end_date)   ? (string)$item->end_date   : '';
            if ($start !== '' && $start > $today) continue; // 아직 시작 전
            if ($end   !== '' && $end   < $today) continue; // 이미 종료됨

            // 회원그룹 필터: 지정이 없으면 전체 노출, 지정하면 해당 그룹 회원(또는 'guest' 선택 시 비로그인)에게만 노출
            $targetGroups = $this->_splitTargetGroups(isset($item->target_groups) ? $item->target_groups : '');
            unset($item->target_groups);
            if (!empty($targetGroups) && !array_intersect($targetGroups, $viewerGroups)) continue;

            // 기본 배경이미지 선택 시 해당 이미지 사용 (업로드 이미지보다 우선, 언어별 이미지보다는 후순위)
            if (!empty($item->body_preset)) $item->body_image = $this->getPresetImageUrl($item->body_preset);
            unset($item->body_preset);

            // 언어별 이미지: 현재 접속 언어 이미지가 있으면 교체, 없으면 기본 이미지 사용
            $lang_images = $this->decodeLangImages(isset($item->body_images) ? $item->body_images : '');
            $cur_lang    = Context::getLangType();
            if (isset($lang_images[$cur_lang])) {
                $item->body_image = $lang_images[$cur_lang];
            }
            unset($item->body_images);

            // 다국어 코드 → 현재 접속 언어의 텍스트로 치환
            foreach ($this->getLangFields() as $f) {
                if (isset($item->{$f})) $item->{$f} = $this->resolveLangText($item->{$f});
            }
            // 게시글 가져오기: 연결된 글이 공개 상태이고 현재 방문자가 열람 가능하면 글 내용으로 본문을 대체 (실시간 반영)
            if (!empty($item->source_document_srl)) {
                $oDocument = \DocumentModel::getDocument((int)$item->source_document_srl, false, false);
                if ($oDocument->isExists() && $oDocument->get('status') === \DocumentModel::getConfigStatus('public') && $oDocument->isAccessible(true)) {
                    // 게시판 화면과 같은 래퍼(rhymix_content xe_content)를 유지해 사이트 CSS 가 그대로 적용되게 한다
                    $raw = $oDocument->getContent(false, true, false, true);
                    // 본문 안의 <style> 은 HTMLFilter 가 글자로 바꿔 버리므로 먼저 떼어 내고, 위험한 구문만 제거한 뒤 앞에 붙인다
                    $css = '';
                    if (preg_match_all('#<style\b[^>]*>(.*?)</style>#is', $raw, $m)) {
                        $css = '<style>' . preg_replace('#@import[^;]*;?|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding#i', '', implode("\n", $m[1])) . '</style>';
                        $raw = preg_replace(array('#<style\b[^>]*>.*?</style>#is', '#<p[^>]*>\s*</p>#i'), '', $raw);
                    }
                    $item->html_content = $css . \Rhymix\Framework\Filters\HTMLFilter::clean($raw, true, true);
                    $item->html_raw     = 'Y'; // 팝업 기본 글꼴·여백 스타일을 끄고 원문 스타일 그대로 표시
                }
            }
            // 에디터 컴포넌트(<img editor_component=...>)를 실제 출력 HTML 로 변환
            if (!empty($item->html_content)) {
                $item->html_content = getController('editor')->transComponent($item->html_content);
            }
            $filtered[$item->slot_number] = $item;
        }

        // 관리자에서 지정한 표시 순서대로 정렬
        $result = array();
        foreach ($this->getSlotOrder() as $slot_number) {
            if (isset($filtered[$slot_number])) {
                $result[] = $filtered[$slot_number];
            }
        }
        return $result;
    }

    function getPopupItemListAll()
    {
        $output = executeQueryArray('triplepopup.getPopupItemListAll');
        if (!$output->toBool()) return array();
        return $output->data ?: array();
    }

    function getPopupItem($slot_number)
    {
        $args = new stdClass();
        $args->slot_number = (int)$slot_number;
        $output = executeQuery('triplepopup.getPopupItem', $args);
        if (!$output->toBool()) return null;
        return $output->data;
    }

    function getSlotMap()
    {
        $items = $this->getPopupItemListAll();
        $map = array();
        foreach ($items as $item) {
            $map[$item->slot_number] = $item;
        }
        return $map;
    }

    /**
     * 표시 순서대로 정렬된 배너 항목 배열을 반환.
     * 등록되지 않은 항목도 기본값으로 채우고, 노출기간 상태(status)와 표시번호(display_no)를 계산한다.
     */
    function getSlotList()
    {
        $map   = $this->getSlotMap();
        $today  = date('Ymd');
        $byNum = array();

        // 노출 회원그룹 선택지: 비로그인 + 사이트의 회원그룹 전체 (관리자 편집 폼용)
        $groupChoices = array();
        $guest = new stdClass();
        $guest->value = 'guest';
        $guest->title = '비로그인';
        $guest->is_guest = true;
        $groupChoices[] = $guest;
        foreach (\MemberModel::getGroups() as $groupSrl => $group) {
            $choice = new stdClass();
            $choice->value    = (string)$groupSrl;
            $choice->title    = $this->resolveLangText($group->title);
            $choice->is_guest = false;
            $groupChoices[] = $choice;
        }

        for ($i = 1; $i <= 6; $i++) {
            if (isset($map[$i]) && $map[$i]) {
                $slot = $map[$i];
                $slot->exists = true;
            } else {
                $slot = new stdClass();
                $slot->slot_number     = $i;
                $slot->badge_text      = '';
                $slot->badge_bg_color  = '#0071e3';
                $slot->badge_text_color = '#ffffff';
                $slot->body_image      = '';
                $slot->body_images     = '';
                $slot->title_text      = '';
                $slot->sub_text        = '';
                $slot->html_content    = '';
                $slot->html_position   = 'top';
                $slot->html_bg_color   = '#ffffff';
                $slot->html_bg_trans   = 0;
                $slot->body_preset     = 0;
                $slot->source_document_srl = '';
                $slot->target_groups   = '';
                $slot->click_url       = '';
                $slot->click_target    = 'blank';
                $slot->footer_text     = '';
                $slot->footer_bg_color = '#0071e3';
                $slot->footer_text_color = '#ffffff';
                $slot->start_date      = '';
                $slot->end_date        = '';
                $slot->is_active       = 'Y';
                $slot->exists          = false;
            }

            $start = isset($slot->start_date) ? (string)$slot->start_date : '';
            $end   = isset($slot->end_date)   ? (string)$slot->end_date   : '';

            // 색상 기본값 보강 (마이그레이션 이전 행 대비)
            if (!isset($slot->badge_text_color)  || $slot->badge_text_color  === '') $slot->badge_text_color  = '#ffffff';
            if (!isset($slot->footer_text_color) || $slot->footer_text_color === '') $slot->footer_text_color = '#ffffff';
            if (!isset($slot->click_target) || $slot->click_target === '') $slot->click_target = 'blank';
            if (!isset($slot->html_content)) $slot->html_content = '';
            if (!isset($slot->html_position) || $slot->html_position !== 'overlay') $slot->html_position = 'top';
            if (!isset($slot->html_bg_color) || $slot->html_bg_color === '') $slot->html_bg_color = '#ffffff';
            $slot->html_bg_trans = isset($slot->html_bg_trans) ? max(0, min(100, (int)$slot->html_bg_trans)) : 0;

            // 기본 배경이미지 목록·선택값 (관리자용)
            $slot->body_preset = isset($slot->body_preset) ? max(0, min(6, (int)$slot->body_preset)) : 0;
            $slot->presets     = array();
            for ($pn = 1; $pn <= 6; $pn++) {
                $pr = new stdClass();
                $pr->no  = $pn;
                $pr->url = $this->getPresetImageUrl($pn);
                $slot->presets[] = $pr;
            }
            $slot->preview_image = $slot->body_preset ? $slot->presets[$slot->body_preset - 1]->url : $slot->body_image;

            // 게시글 가져오기: 연결된 글 번호·제목 (관리자 표시용)
            if (empty($slot->source_document_srl)) $slot->source_document_srl = '';
            $slot->source_document_title = $slot->source_document_srl ? \DocumentModel::getDocument((int)$slot->source_document_srl, false, false)->getTitleText() : '';

            // 노출 회원그룹: 선택지에 현재 선택 여부를 표시 (미선택 = 전체 노출)
            $pickedGroups = $this->_splitTargetGroups(isset($slot->target_groups) ? $slot->target_groups : '');
            $slot->groups = array();
            foreach ($groupChoices as $choice) {
                $row = clone $choice;
                $row->checked = in_array($row->value, $pickedGroups, true);
                $slot->groups[] = $row;
            }

            // 언어별 이미지 목록 (관리자 탭용)
            $lang_images = $this->decodeLangImages(isset($slot->body_images) ? $slot->body_images : '');
            $slot->lang_images = array();
            foreach ($this->getEnabledLangs() as $code => $name) {
                $li = new stdClass();
                $li->code  = $code;
                $li->name  = $name;
                $li->image = isset($lang_images[$code]) ? $lang_images[$code] : '';
                $slot->lang_images[] = $li;
            }

            // 관리자 미리보기용 표시 텍스트 (다국어 코드 치환값)
            foreach ($this->getLangFields() as $f) {
                $slot->{$f . '_display'} = $this->resolveLangText(isset($slot->{$f}) ? $slot->{$f} : '');
            }

            $slot->start_date_input = $this->_toDateInput($start);
            $slot->end_date_input   = $this->_toDateInput($end);
            $slot->period_label     = $this->_periodLabel($start, $end);

            if (!$slot->exists) {
                $slot->status = 'none';
            } elseif ($slot->is_active !== 'Y') {
                $slot->status = 'inactive';
            } elseif ($end !== '' && $end < $today) {
                $slot->status = 'expired';
            } elseif ($start !== '' && $start > $today) {
                $slot->status = 'pending';
            } else {
                $slot->status = 'active';
            }

            $byNum[$i] = $slot;
        }

        // 표시 순서대로 재배열 + 표시번호 부여
        $list = array();
        $pos  = 1;
        foreach ($this->getSlotOrder() as $slot_number) {
            if (!isset($byNum[$slot_number])) continue;
            $slot = $byNum[$slot_number];
            $slot->display_no = $pos++;
            $list[] = $slot;
        }
        return $list;
    }

    /** 'guest,3,5' 형태의 저장값 → 배열 (빈 값이면 빈 배열 = 전체 노출) */
    function _splitTargetGroups($value)
    {
        return array_values(array_filter(explode(',', (string)$value), 'strlen'));
    }

    function _toDateInput($ymd)
    {
        if (strlen($ymd) !== 8) return '';
        return substr($ymd, 0, 4) . '-' . substr($ymd, 4, 2) . '-' . substr($ymd, 6, 2);
    }

    function _fmtDot($ymd)
    {
        if (strlen($ymd) !== 8) return '';
        return substr($ymd, 2, 2) . '.' . substr($ymd, 4, 2) . '.' . substr($ymd, 6, 2);
    }

    function _periodLabel($start, $end)
    {
        $s = $this->_fmtDot($start);
        $e = $this->_fmtDot($end);
        if ($s === '' && $e === '') return '상시';
        if ($s !== '' && $e !== '') return $s . ' ~ ' . $e;
        if ($s !== '') return $s . ' ~';
        return '~ ' . $e;
    }
}
