<?php
/**
 * Plugin Name: Sídlisko Píly – pasport budov
 * Description: Vloží interaktívny pasport budov, priečelí a výskytov sgrafít (georeferencovaná mapa cez Mapbox, dáta v Supabase) cez shortcode [sidlisko_pily].
 * Version: 2.32.1
 * Author: Ars Preuge
 */

if (!defined('ABSPATH')) exit;

define('SIDLISKO_PILY_VERSION', '2.32.1');

function sidlisko_pily_enqueue_assets() {
    global $post;
    if (!is_a($post, 'WP_Post') || !has_shortcode($post->post_content, 'sidlisko_pily')) return;

    wp_enqueue_style('sidlisko-pily-fonts', 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&display=swap', [], null);
    wp_enqueue_style('sidlisko-pily-mapbox-css', 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css', [], '3.1.2');
    wp_enqueue_script('sidlisko-pily-mapbox-js', 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.js', [], '3.1.2', true);
    wp_enqueue_script('sidlisko-pily-supabase-js', 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', [], null, true);

    wp_register_style('sidlisko-pily-style', false, [], SIDLISKO_PILY_VERSION);
    wp_enqueue_style('sidlisko-pily-style');
    wp_add_inline_style('sidlisko-pily-style', sidlisko_pily_asset('app.css'));

    wp_register_script('sidlisko-pily-app-js', false, ['sidlisko-pily-mapbox-js', 'sidlisko-pily-supabase-js'], SIDLISKO_PILY_VERSION, true);
    wp_enqueue_script('sidlisko-pily-app-js');
    wp_add_inline_script('sidlisko-pily-app-js', sidlisko_pily_asset('app.js'));
}
add_action('wp_enqueue_scripts', 'sidlisko_pily_enqueue_assets');

/**
 * Načíta app.css / app.js z tohto priečinka. Sú to tie isté súbory, ktoré
 * používa aj samostatná verzia appky (index.html v repozitári) — žiadna
 * kópia kódu, jeden zdroj pravdy pre oboje.
 */
function sidlisko_pily_asset($filename) {
    $path = plugin_dir_path(__FILE__) . $filename;
    return file_exists($path) ? file_get_contents($path) : '';
}

function sidlisko_pily_shortcode() {
    ob_start();
    ?>
    <div class="sidlisko-pily-app">
      <header>
        <h1><a href="https://www.novesidlisko.sk/nkp">Sídlisko Píly</a></h1>
        <span class="sub">pasport budov a umeleckých diel</span>
        <span class="spacer"></span>
        <button class="tool" data-tab="prehlad" aria-pressed="true">Prehľad</button>
        <button class="tool" data-tab="budovy" aria-pressed="false">Budovy</button>
        <button class="tool" data-tab="umelci" aria-pressed="false">Umelci</button>
        <button class="tool" data-tab="motivy" aria-pressed="false">Motívy</button>
      </header>
      <main>
        <div id="sp-viewport">
          <div id="sp-map"></div>
          <div class="geobadge">WGS84 · mapbox://styles/tomin9/cle5ygem4004h01qge9x73z3q</div>
          <div class="mapnote" id="sp-mapnote"></div>
        </div>
        <aside id="sp-panel"></aside>
        <aside id="sp-detail"></aside>
      </main>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('sidlisko_pily', 'sidlisko_pily_shortcode');
