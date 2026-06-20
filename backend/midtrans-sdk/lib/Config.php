<?php
namespace Midtrans;

/**
 * Midtrans Config
 * Menyimpan konfigurasi global untuk SDK Midtrans
 */
class Config
{
    /** @var string Server Key dari dashboard Midtrans */
    public static $serverKey = '';

    /** @var string Client Key dari dashboard Midtrans */
    public static $clientKey = '';

    /** @var bool true = production, false = sandbox */
    public static $isProduction = false;

    /** @var bool Sanitasi input otomatis */
    public static $isSanitized = false;

    /** @var bool Aktifkan 3DS untuk kartu kredit */
    public static $is3ds = false;

    /**
     * Kembalikan base URL API Midtrans sesuai environment
     */
    public static function getBaseUrl()
    {
        if (self::$isProduction) {
            return 'https://api.midtrans.com';
        }
        return 'https://api.sandbox.midtrans.com';
    }

    /**
     * Kembalikan base URL Snap sesuai environment
     */
    public static function getSnapUrl()
    {
        if (self::$isProduction) {
            return 'https://app.midtrans.com/snap/snap.js';
        }
        return 'https://app.sandbox.midtrans.com/snap/snap.js';
    }
}
