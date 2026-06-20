<?php
namespace Midtrans;

/**
 * Midtrans HttpClient
 * Mengirim HTTP request ke API Midtrans menggunakan cURL
 */
class HttpClient
{
    /**
     * Kirim POST request ke Midtrans API
     *
     * @param string $url  URL endpoint
     * @param array  $data Data yang akan dikirim (akan di-encode ke JSON)
     * @return array       Response dari Midtrans
     * @throws \Exception  Jika terjadi error HTTP atau cURL
     */
    public static function post($url, $data)
    {
        $serverKey = Config::$serverKey;

        // Midtrans menggunakan Basic Auth: server_key sebagai username, password kosong
        $auth = base64_encode($serverKey . ':');

        $payload = json_encode($data);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Basic ' . $auth,
        ]);
        // Di sandbox, kita nonaktifkan verifikasi SSL untuk kemudahan development
        // JANGAN lakukan ini di production!
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, !Config::$isProduction ? false : true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $response  = curl_exec($ch);
        $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new \Exception('cURL Error: ' . $curlError);
        }

        $result = json_decode($response, true);

        if ($httpCode >= 400) {
            $errMessage = $result['error_messages'][0] ?? $result['message'] ?? 'Unknown error from Midtrans';
            throw new \Exception('Midtrans API Error [HTTP ' . $httpCode . ']: ' . $errMessage);
        }

        return $result;
    }
}
