<script>
  import emitter from "@/emit";

  const emit = emitter({
    dismiss() {}
  });
</script>

<style lang="scss">
  $modalPadding: 20px;

  .shim {
    background: rgba(88, 33, 33, 0.57);
    backdrop-filter: blur(1px);
    z-index: 8;
  }

  .shimleft {
    position: absolute;
    left: 0;
    width: $modalPadding;
    top: 0;
    bottom: $modalPadding;
  }

  .shimtop {
    position: absolute;
    left: $modalPadding;
    right: 0;
    top: 0;
    height: $modalPadding;
  }

  .shimright {
    position: absolute;
    top: $modalPadding;
    right: 0;
    width: $modalPadding;
    bottom: 0;
  }

  .shimbottom {
    position: absolute;
    bottom: 0;
    height: $modalPadding;
    left: 0;
    right: $modalPadding;
  }

  .modal {
    z-index: 9;
    position: absolute;
    top: $modalPadding;
    left: $modalPadding;
    width: calc(100vw - #{$modalPadding * 2});
    height: calc(100vh - #{$modalPadding * 2});
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(1px);
    z-index: 10;
    box-shadow: 0 0 11px rgba(0, 0, 0, 0.5);

    .close {
      margin: 10px;
      padding: 3px;
      font-size: 20px;
      line-height: 20px;
      width: 20px;
      text-align: center;
      display: inline-block;
      cursor: pointer;
      user-select: none;
      @include on-hover {
        background: rgba(0, 0, 0, 0.08);
      }
    }

    .content {
      position: absolute;
      left: 40px;
      right: 20px;
      top: 5px;
      bottom: 0;
      overflow: auto;
      padding: 10px 20px;
    }
  }
</style>

<div class="shim shimleft" on:click={emit.dismiss} />
<div class="shim shimtop" on:click={emit.dismiss} />
<div class="shim shimright" on:click={emit.dismiss} />
<div class="shim shimbottom" on:click={emit.dismiss} />
<div class="modal">
  <span class="close" on:click={emit.dismiss}>&times;</span>
  <div class="content">
    <slot />
  </div>
</div>

<svelte:window on:keydown={e => e.key == 'Escape' && emit.dismiss()} />
