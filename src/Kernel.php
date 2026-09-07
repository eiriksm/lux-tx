<?php

namespace App;

use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;

class Kernel extends BaseKernel
{
    use MicroKernelTrait;

    /**
     * The commit the running code was deployed from, written to .hash by the
     * deploy script before it clears the cache. Resolved once at compile time
     * and baked into the container, so it lives as long as the warmed cache
     * does rather than costing a stat on every request.
     */
    protected function build(ContainerBuilder $container): void
    {
        $file = $this->getProjectDir() . '/.hash';
        $hash = is_file($file) ? trim((string) @file_get_contents($file)) : '';

        $container->setParameter('app.deploy_hash', $hash ?: 'dev');
    }
}
