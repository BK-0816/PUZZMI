Deno.serve(() => {
  const html = `
    <script language="javascript" type="text/javascript" src="https://stdpay.inicis.com/stdjs/INIStdPay_close.js" charset="UTF-8"></script>
  `;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
  });
});