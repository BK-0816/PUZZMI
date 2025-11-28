<?php

@extract($_GET);
@extract($_POST);
@extract($_SERVER);

$value = json_decode(file_get_contents('php://input'), true);


$TEMP_IP = getenv("REMOTE_ADDR");
$PG_IP = substr($TEMP_IP, 0, 10);

if ($PG_IP == "203.238.37" || $PG_IP == "39.115.212") {  //PG에서 보냈는지 IP로 체크

    $tid           = $value["tid"];
    $mid           = $value["mid"];
    $applDt        = $value["applDt"];
    $applTm        = $value["applTm"];
    $status        = $value["status"];
    $payNm         = $value["payNm"];
    $orderId       = $value["orderId"];
    $applNo        = $value["applNo"];
    $sid           = $value["sid"];
    $convenience   = $value["convenience"];
    $confNo        = $value["confNo"];
    $receiptNo     = $value["receiptNo"];
    $paymentTerm   = $value["paymentTerm"];
    $amount        = $value["amount"];
    $currencyCd    = $value["currencyCd"];


 	// 결제처리에 관한 로그 기록
 	writeLog($value);
 
	/***********************************************************************************
	 ' 위에서 상점 데이터베이스에 등록 성공유무에 따라서 성공시에는 "OK"를 이니시스로 실패시는 "FAIL" 을
	 ' 리턴하셔야합니다. 아래 조건에 데이터베이스 성공시 받는 FLAG 변수를 넣으세요
	 ' (주의) OK를 리턴하지 않으시면 이니시스 지불 서버는 "OK"를 수신할때까지 계속 재전송을 시도합니다
	 ' 기타 다른 형태의 echo "" 는 하지 않으시기 바랍니다
	'***********************************************************************************/
	
	// if(데이터베이스 등록 성공 유무 조건변수 = true)
	    echo "OK"; //절대로 지우지 마세요
	// else
	//	 echo "FAIL";

   }

function writeLog($msg)
{
    $file = "noti_input_".date("Ymd").".log";

    if(!($fp = fopen("log/".$file, "a+"))) return 0;
                
    ob_start();
    print_r($msg);
    $ob_msg = ob_get_contents();
    ob_clean();
		
    if(fwrite($fp, " ".$ob_msg."\n") === FALSE)
    {
        fclose($fp);
        return 0;
    }
    fclose($fp);
    return 1;
}
?>
