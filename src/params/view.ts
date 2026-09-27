import type { ParamMatcher } from '@sveltejs/kit';
import { isViewSlug } from '$lib/forecastViews';

// /pohoda/kyiv/zavtra, /10-dniv, /vykhidni — інші адреси другого рівня не існують
export const match: ParamMatcher = (param) => isViewSlug(param);
