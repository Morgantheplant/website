<?php
/**
 * The base configurations of the WordPress.
 *
 * This file has the following configurations: MySQL settings, Table Prefix,
 * Secret Keys, WordPress Language, and ABSPATH. You can find more information
 * by visiting {@link http://codex.wordpress.org/Editing_wp-config.php Editing
 * wp-config.php} Codex page. You can get the MySQL settings from your web host.
 *
 * This file is used by the wp-config.php creation script during the
 * installation. You don't have to use the web site, you can just copy this file
 * to "wp-config.php" and fill in the values.
 *
 * @package WordPress
 */

// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define('DB_NAME', 'morganth_wor1');

/** MySQL database username */
define('DB_USER', 'morganth_wor1');

/** MySQL database password */
define('DB_PASSWORD', 'DhV1y587');

/** MySQL hostname */
define('DB_HOST', 'localhost');

/** Database Charset to use in creating database tables. */
define('DB_CHARSET', 'utf8');

/** The Database Collate type. Don't change this if in doubt. */
define('DB_COLLATE', '');

/**#@+
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define('AUTH_KEY',         'R+j.d!;=tw!|7H/Vnyzv1@/+hG#.b-:|,>^Fk=V|UIR]nc.32q&Wy,Vj*JG%KpT4');
define('SECURE_AUTH_KEY',  '+s5%l5~>}1sfvdi0DB+`WTz!zQzrFcsHL>34,J6QJnVX|yROpAFaS+},-kS,EY<-');
define('LOGGED_IN_KEY',    '{xn8h*t0wHrH!hV8JD@Iz,j38PSHajz4-O,7=A|YfOtrn[(eK7n:t 6D4(t+^,ov');
define('NONCE_KEY',        '870H1K6VS4,ITP9q<yv%XUGn[I<+=|g}x}:(td`GR-axz5.KB[@,-8R`Ct]%~xn=');
define('AUTH_SALT',        'Tn{-L+S>>+GX6>kLmf)0;x@2j57K1)m67S(_Ku-nQADB@P7sKDz]`608Hb{^*7}Z');
define('SECURE_AUTH_SALT', '^zJ_<K.w+59tHe4D-jDp-aR`<P* 4+8|JT@ssNHkh-P@c7l~g8(lL*(8_8rw{FFp');
define('LOGGED_IN_SALT',   'r12U}I+Yd1-aGVJuBiUqk/K1T>1_FkP~2)I^}JMeI3Kx++qS+lSY8%g<5[+Zp5D*');
define('NONCE_SALT',       '-Ln:rc5<0S< (%Ec-r_8IIk|E8tP7T+A8u)<E`cNTO?3nCca2^,?B[FepzK4fb?^');

/**#@-*/

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each a unique
 * prefix. Only numbers, letters, and underscores please!
 */
$table_prefix  = 'jzm_';

/**
 * WordPress Localized Language, defaults to English.
 *
 * Change this to localize WordPress. A corresponding MO file for the chosen
 * language must be installed to wp-content/languages. For example, install
 * de_DE.mo to wp-content/languages and set WPLANG to 'de_DE' to enable German
 * language support.
 */
define('WPLANG', '');

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 */
define('WP_DEBUG', false);

/* That's all, stop editing! Happy blogging. */

/** Absolute path to the WordPress directory. */
if ( !defined('ABSPATH') )
	define('ABSPATH', dirname(__FILE__) . '/');

/** Sets up WordPress vars and included files. */
require_once(ABSPATH . 'wp-settings.php');
