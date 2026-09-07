<?php

namespace App;

use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;

class Kernel extends BaseKernel
{
    use MicroKernelTrait;

    /** Built by `npm run build`, linked from the page with a cache-busting query. */
    private const ASSETS = [
        '/public/assets/app.css',
        '/public/assets/app.js',
    ];

    /**
     * Both values are resolved once at compile time and baked into the
     * container, so they live as long as the warmed cache does rather than
     * costing a stat on every request. The deploy script writes .hash and
     * rebuilds the assets before it clears the cache, so a fresh container
     * always sees the fresh files.
     */
    protected function build(ContainerBuilder $container): void
    {
        $container->setParameter('app.deploy_hash', $this->deployHash());
        $container->setParameter('app.asset_version', $this->assetVersion());
    }

    /** The commit the running code was deployed from; absent in dev. */
    private function deployHash(): string
    {
        $file = $this->getProjectDir() . '/.hash';
        $hash = is_file($file) ? trim((string) @file_get_contents($file)) : '';

        return $hash ?: 'dev';
    }

    /**
     * Content hash of the built assets, so a deploy that leaves them untouched
     * doesn't make every client re-download them.
     */
    private function assetVersion(): string
    {
        $fingerprint = '';
        foreach (self::ASSETS as $asset) {
            $file = $this->getProjectDir() . $asset;
            $fingerprint .= is_file($file) ? (string) md5_file($file) : '';
        }

        return substr(md5($fingerprint), 0, 8);
    }
}
