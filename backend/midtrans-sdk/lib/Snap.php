<?php
namespace Midtrans;

/**
 * Midtrans Snap
 * Snap adalah metode pembayaran Midtrans dengan popup UI bawaan.
 * Kita hanya perlu mendapatkan snap_token, lalu token tersebut
 * digunakan di frontend untuk membuka popup pembayaran.
 */
class Snap
{
    /**
     * Minta snap_token ke Midtrans
     *
     * @param array $params Parameter transaksi
     * @return string snap_token
     * @throws \Exception
     */
    public static function getSnapToken($params)
    {
        $url = Config::getBaseUrl() . '/snap/v1/transactions';

        $response = HttpClient::post($url, $params);

        if (!isset($response['token'])) {
            throw new \Exception('Midtrans tidak mengembalikan token. Response: ' . json_encode($response));
        }

        return $response['token'];
    }
}
