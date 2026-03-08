<?php

$apikey 		= "5AL5Djb1Ipualn0F";								// INIAPI Key
$cbtType		= "JPPG";											// CBT 결제방식 ("JPPG" , "SBPS" 선택 사용)
$mid 			= "CBTTEST001";										// 상점아이디
$timestamp 		= time();											// timestamp 생성
$orderId    	= $mid."_".$timestamp;								// 가맹점 주문번호(가맹점에서 직접 설정)
$amount 		= "10";												// 상품가격(특수기호 제외, 가맹점에서 직접 설정)

$hashData = hash("sha512",$apikey.$mid.$timestamp.$amount.$orderId);// hash 암호화

// extraData 데이터 생성
$extraData = json_encode([
    "paymentUI" => [
        "language" => "",
        "logoUrl" => "",
        "colorTheme" => ""
    ],
    "payment" => [
        "paymethod" => ["CARD", "CVS", "PAYpay", "LINEpay"],
        "isMobile" => "true",
        "card" => [
            "payType" => ["one", "installments"],
            "installMonth" => [3, 5, 6, 10, 12]
        ],
        "cvs" => [
            "notiUrl" => "https://merchantdomain.com/noti_recv",
            "contactInfo" => "MerchantInfo",
            "contactTelNum" => "37-1234-1235",
            "contactHours" => "09:00-18:00",
            "customerKana" => "09:00-18:00",
            "customerFirstKana" => "09:00-18:00",
            "paymentTermDay" => 5
        ],
        "linepay" => [
            "productImageUrl" => "https://merchantdomain.com/product.png"
        ]
    ],
    "sbpsPayment" => [
        "userId" => "inicistest"
    ],
    "gmoPayment" => [
        "merchantName" => "韓国ストア",
        "merchantNameKana" => "カンコクストア",
        "merchantNameAlphabet" => "Kankoku Store",
        "merchantNameShort" => "カンコク",
        "contactName" => "サポート窓口",
        "contactEmail" => "support@sample.com",
        "contactPhone" => "080-1234-5678",
        "contactOpeningHours" => "10:00-18:00"
    ]
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

?>
<!DOCTYPE html>
<html lang="ko">

    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport"
            content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>KG이니시스 결제샘플</title>
        <link rel="stylesheet" href="css/style.css">
		<link rel="stylesheet" href="css/bootstrap.min.css">
		
		<script> 
	        function on_pay() { 
	        	myform = document.payform; 
	        	myform.action = "https://devcbt.inicis.com/cbtauth";
	        	myform.target = "_self";
	        	myform.submit(); 
	        }
        </script>
    </head>

    <body class="wrap">

        <!-- 본문 -->
        <main class="col-8 cont" id="bill-01">
		    <!-- 페이지타이틀 -->
            <section class="mb-5">
                <div class="tit">
                    <h2>일본결제</h2>
                    <p>KG이니시스 결제창을 호출하여 CBT 결제를 제공하는 서비스</p>
                </div>
            </section>
            <!-- //페이지타이틀 -->

            <!-- 카드CONTENTS -->
            <section class="menu_cont mb-5">
                <div class="card">
                    <div class="card_tit">
                        <h3>CBT결제</h3>
                    </div>

                    <form name="payform" id="payform" method="post" class="mt-5">
                        <div class="row g-3 justify-content-between" style="--bs-gutter-x:0rem;">
				    
                            <label class="col-10 col-sm-2 input param" style="border:none;">cbtType</label>
                            <label class="col-10 col-sm-9 input">
                                <input type="text" name="cbtType" id="cbtType" value="<?php echo $cbtType ?>">
                            </label>
				    		
				    		<label class="col-10 col-sm-2 input param" style="border:none;">mid</label>
                            <label class="col-10 col-sm-9 input">
                                <input type="text" name="mid" value="<?php echo $mid ?>">
                            </label>
				    
                            <label class="col-10 col-sm-2 input param" style="border:none;">timestamp</label>
                            <label class="col-10 col-sm-9 input">
                                <input type="text" name="timestamp" value="<?php echo $timestamp ?>">
                            </label>
				    		
				    		<label class="col-10 col-sm-2 input param" style="border:none;">orderId</label>
                            <label class="col-10 col-sm-9 input">
                                <input type="text" name="orderId" value="<?php echo $orderId ?>">
                            </label>
							
							<label class="col-10 col-sm-2 input param" style="border:none;">goodName</label>
                            <label class="col-10 col-sm-9 input">
                                <input type="text" name="goodName" value="테스트상품">
                            </label>
				    		
				    		<label class="col-10 col-sm-2 input param" style="border:none;">amount</label>
                            <label class="col-10 col-sm-9 input">
                                <input type="text" name="amount" value="<?php echo $amount ?>">
                            </label>
				    		
				    		<label class="col-10 col-sm-2 input param" style="border:none;">buyerName</label>
                            <label class="col-10 col-sm-9 input">
                                <input type="text" name="buyerName" value="홍길동">
                            </label>
				    		
				    		<label class="col-10 col-sm-2 input param" style="border:none;">buyerTel</label>
                            <label class="col-10 col-sm-9 input">
                                <input type="text" name="buyerTel" value="01012345678">
                            </label>
				    		
				    		<label class="col-10 col-sm-2 input param" style="border:none;">buyerEmail</label>
                            <label class="col-10 col-sm-9 input">
                                <input type="text" name="buyerEmail" value="test@test.com">
                            </label>
							
							<label class="col-10 col-sm-2 input param" style="border:none;">goodName</label>
                            <label class="col-10 col-sm-9 input">
                                <input type="text" name="goodName" value="test">
                            </label>
				    		
				    		<input type="hidden" name="returnUrl" value="https://merchantdomain.com/cbt/return.php">
							
							<label class="col-10 col-sm-2 input param" style="border:none;">hashData</label>
                            <label class="col-10 col-sm-9 input">
                                <input type="text" name="hashData" value="<?php echo $hashData ?>">
                            </label>

							<label class="col-10 col-sm-2 input param" style="border:none;">extraData</label>
                            <label class="col-10 col-sm-9 input">
							    <input type="text" name="extraData" value="<?php echo htmlspecialchars($extraData) ?>">
							</label>
							
                        </div>
                    </form>
				
				    <button onclick="on_pay()" class="btn_solid_pri col-6 mx-auto btn_lg" style="margin-top:50px">결제 요청</button>
					
                </div>
            </section>
			
        </main>
		
    </body>
</html>