<?php
class triplepopupView extends triplepopup
{
    function init() {}

    function getTriplepopupData()
    {
        $oModel = getModel('triplepopup');
        $this->add('config', $oModel->getPopupConfig());
        $this->add('items',  $oModel->getPopupItemList());
        Context::setResponseMethod('JSON');
    }
}
