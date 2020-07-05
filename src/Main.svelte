<script>
  import { router, Router, currentUrl } from "@/router/router";
  import { routes } from "@/routes";
  import { onMount } from "svelte";

  // Set up routes
  router.routes = new Router(...routes);

  let resolvedRoute = null;

  onMount(() => {
    router.currentUrl = currentUrl();
    if (!history.state) {
      window.history.replaceState(
        { path: currentUrl() },
        "",
        window.location.href
      );
    }

    router.subscribe(() => (resolvedRoute = router.resolvedRoute));
  });

  function handleBackNav(e) {
    router.currentUrl = e.state.path;
  }
</script>

<svelte:window on:popstate={handleBackNav} />

{#if resolvedRoute != null}
  <svelte:component this={resolvedRoute.component} {...resolvedRoute.props} />
{/if}
