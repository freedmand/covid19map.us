<script>
  import Link from "@/router/Link";
</script>

<style lang="scss">
  header {
    background: #7b0000;
    color: white;
    height: $headerHeight;
    line-height: $headerHeight;
    padding: 0 20px;
    font-size: 16px;
    box-shadow: 0 0 2px black;

    > :global(*) {
      margin: 0 8px;
      display: inline-block;
      vertical-align: middle;
    }
  }
</style>

<header>
  <Link to="home">
    <b>Covid19Map.us</b>
  </Link>
  <Link to="about">About</Link>
</header>
