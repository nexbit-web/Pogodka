<script lang="ts">
	import CityPage from '$lib/components/shared/CityPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<CityPage {data} />
