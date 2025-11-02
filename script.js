// Shared utilities and layout injection

// Inject Navbar and Footer on each page to keep consistency
(function injectLayout() {
	const navbar = document.getElementById('navbar');
	if (navbar) {
		navbar.innerHTML = `
			<nav class="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur nav-shadow">
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div class="flex items-center justify-between h-16">
						<a href="index.html" class="flex items-center gap-2">
							
							<span class="font-semibold text-slate-900">Comparely</span>
						</a>
						<div class="hidden md:flex items-center gap-6">
							<a href="availability.html" class="text-slate-700 hover:text-slate-900">Availability</a>
							<a href="competitors.html" class="text-slate-700 hover:text-slate-900">Competitors</a>
							<a href="pricing.html" class="text-slate-700 hover:text-slate-900">Pricing</a>
							<a href="register.html" class="ml-2 inline-flex items-center px-3 py-1.5 rounded-md btn-gradient">Register</a>
						</div>
					</div>
				</div>
			</nav>
		`;
	}

	const footer = document.getElementById('footer');
	if (footer) {
		const year = new Date().getFullYear();
		footer.innerHTML = `
			<footer class="mt-24 border-t border-slate-200">
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
					<div class="flex flex-col md:flex-row items-center justify-between gap-4">
						<p class="text-sm text-slate-600">© ${year} Comparely. Built for data-driven brands.</p>
						<div class="flex items-center gap-4 text-slate-600">
							<a class="footer-link" href="#">Twitter</a>
							<a class="footer-link" href="#">LinkedIn</a>
							<a class="footer-link" href="#">GitHub</a>
						</div>
					</div>
				</div>
			</footer>
		`;
	}
})();

// Initialize AOS animations if present
(function initAOS() {
	if (window.AOS) {
		AOS.init({ duration: 700, once: true, offset: 40 });
	}
})();

// Fetch helper
async function fetchJSON(path) {
	const res = await fetch(path);
	if (!res.ok) throw new Error(`Failed to load ${path}`);
	return res.json();
}

function statusFromStock(stock) {
	if (stock <= 0) return { label: 'Out of stock', cls: 'out-of-stock' };
	if (stock < 15) return { label: 'Low stock', cls: 'low-stock' };
	return { label: 'In stock', cls: 'in-stock' };
}

function debounce(fn, delay) {
	let t;
	return (...args) => {
		clearTimeout(t);
		t = setTimeout(() => fn.apply(null, args), delay);
	};
}

// Mock registration handling
(function registerHandler() {
	const form = document.getElementById('register-form');
	if (!form) return;
	form.addEventListener('submit', (e) => {
		e.preventDefault();
		const brand = form.brand.value.trim();
		const email = form.email.value.trim();
		const password = form.password.value.trim();
		if (!brand || !email || password.length < 6) {
			alert('Please enter brand, valid email, and a password (min 6 chars).');
			return;
		}
		localStorage.setItem('ip_registered_brand', brand);
		window.location.href = 'availability.html';
	});

	['blinkit-btn', 'zepto-btn', 'goat-btn'].forEach((id) => {
		const btn = document.getElementById(id);
		if (!btn) return;
		btn.addEventListener('click', () => {
			localStorage.setItem('ip_registered_brand', btn.dataset.provider + ' Brand');
			window.location.href = 'availability.html';
		});
	});
})();

// Availability page logic
(async function availabilityPage() {
	const tableBody = document.getElementById('availability-rows');
	const searchInput = document.getElementById('availability-search');
	const chartEl = document.getElementById('availability-chart');
	if (!tableBody || !searchInput || !chartEl) return;

	const data = await fetchJSON('data.json');
	let items = data.products || [];

	function renderRows(list) {
		tableBody.innerHTML = list.map((p) => {
			const st = statusFromStock(p.stock);
			return `
				<tr class="border-b border-slate-100">
					<td class="px-3 py-2 text-sm text-slate-800">${p.name}</td>
					<td class="px-3 py-2 text-sm text-slate-600">${p.pincode}</td>
					<td class="px-3 py-2 text-sm"><span class="badge ${st.cls}">${st.label}</span></td>
					<td class="px-3 py-2 text-sm text-slate-600">${p.stock}</td>
				</tr>
			`;
		}).join('');
	}

	renderRows(items);

	// Build bar chart by pincode (darkstore proxy)
	const byPincode = {};
	items.forEach((p) => { byPincode[p.pincode] = (byPincode[p.pincode] || 0) + p.stock; });
	const labels = Object.keys(byPincode);
	const values = Object.values(byPincode);
	new Chart(chartEl, {
		type: 'bar',
		data: {
			labels,
			datasets: [{
				label: 'Total Stock by Pincode',
				data: values,
				backgroundColor: 'rgba(59,130,246,0.6)'
			}]
		},
		options: { responsive: true, plugins: { legend: { display: true }}}
	});

	const doFilter = debounce((q) => {
		q = q.toLowerCase();
		const filtered = items.filter(p =>
			p.name.toLowerCase().includes(q) || p.pincode.toLowerCase().includes(q)
		);
		renderRows(filtered);
	}, 200);

	searchInput.addEventListener('input', (e) => doFilter(e.target.value));
})();

// Competitors page logic
(async function competitorsPage() {
	const tableBody = document.getElementById('competitor-rows');
	const chartEl = document.getElementById('competitors-chart');
	const aiBox = document.getElementById('ai-reco');
	if (!tableBody || !chartEl || !aiBox) return;

	const data = await fetchJSON('data.json');
	const items = data.products || [];

	function competitorArray(p) {
		// Normalize to two competitors
		if (Array.isArray(p.competitors) && p.competitors.length) return p.competitors.slice(0, 2);
		return [
			{ name: 'Competitor A', stock: p.competitorStock ?? Math.max(0, p.stock - 5), price: p.competitorPrice ?? (p.price - 2) },
			{ name: 'Competitor B', stock: Math.max(0, (p.competitorStock ?? p.stock) - 10), price: Math.max(1, (p.competitorPrice ?? p.price) - 3) }
		];
	}

	tableBody.innerHTML = items.map((p) => {
		const comps = competitorArray(p);
		return `
			<tr class="border-b border-slate-100">
				<td class="px-3 py-2 text-sm text-slate-800">${p.name}</td>
				<td class="px-3 py-2 text-sm text-slate-600">${p.pincode}</td>
				<td class="px-3 py-2 text-sm text-slate-600">${p.price}</td>
				<td class="px-3 py-2 text-sm text-slate-600">${comps[0].price}</td>
				<td class="px-3 py-2 text-sm text-slate-600">${comps[1].price}</td>
				<td class="px-3 py-2 text-sm text-slate-600">${p.stock}</td>
				<td class="px-3 py-2 text-sm text-slate-600">${comps[0].stock}</td>
				<td class="px-3 py-2 text-sm text-slate-600">${comps[1].stock}</td>
			</tr>
		`;
	}).join('');

	// Chart - side-by-side bars per product (brand vs two competitors)
	const labels = items.map(p => p.name);
	const brand = items.map(p => p.stock);
	const compA = items.map(p => competitorArray(p)[0].stock);
	const compB = items.map(p => competitorArray(p)[1].stock);

	new Chart(chartEl, {
		type: 'bar',
		data: {
			labels,
			datasets: [
				{ label: 'Your Brand', data: brand, backgroundColor: 'rgba(59,130,246,0.6)' },
				{ label: 'Competitor A', data: compA, backgroundColor: 'rgba(16,185,129,0.6)' },
				{ label: 'Competitor B', data: compB, backgroundColor: 'rgba(234,179,8,0.6)' }
			]
		},
		options: { responsive: true, scales: { x: { stacked: false }, y: { beginAtZero: true }}}
	});

	// AI-style recommendation (simple heuristics)
	const underIndex = compA.findIndex((s, i) => brand[i] + 5 < Math.max(s, compB[i]));
	if (underIndex >= 0) {
		const sample = items[underIndex];
		const zone = sample.pincode;
		const diff = Math.max(compA[underIndex], compB[underIndex]) - brand[underIndex];
		const pct = Math.max(8, Math.min(35, Math.round((diff / Math.max(1, brand[underIndex])) * 100)));
		aiBox.textContent = `Your product is ~${pct}% less available in Zone ${zone}. Consider restocking to match competitors.`;
	} else {
		aiBox.textContent = 'Availability parity achieved across zones. Maintain replenishment cadence to sustain share.';
	}
})();

// Pricing page logic
(async function pricingPage() {
	const container = document.getElementById('pricing-container');
	const generateBtn = document.getElementById('generate-strategy');
	const recoPrice = document.getElementById('reco-price');
	const recoSales = document.getElementById('reco-sales');
	const recoMargin = document.getElementById('reco-margin');
	const chartEl = document.getElementById('pricing-chart');
	if (!container || !generateBtn || !recoPrice || !recoSales || !recoMargin || !chartEl) return;

	const data = await fetchJSON('data.json');
	const items = data.products || [];

	function randomPick() {
		return items[Math.floor(Math.random() * items.length)];
	}

	let chartInstance = null;

	function runStrategy(base) {
		const brandStock = base.stock;
		const competitor = Array.isArray(base.competitors) && base.competitors.length ? base.competitors[0] : { price: base.competitorPrice ?? base.price - 2, stock: base.competitorStock ?? Math.max(0, base.stock - 5) };
		const competitorPrice = competitor.price;
		const competitorStock = competitor.stock;
		let optimalPrice = base.price;

		// Add slight randomness to simulate AI exploration
		const jitter = 1 + (Math.random() * 0.06 - 0.03); // ±3%

		if (competitorPrice < base.price && competitorStock > brandStock) {
			optimalPrice = base.price * 0.9;
		} else if (brandStock < 20) {
			optimalPrice = base.price * 1.1;
		} else if (brandStock > 50) {
			optimalPrice = base.price * 0.95;
		} else {
			optimalPrice = base.price;
		}

		optimalPrice = Math.max(1, Math.round(optimalPrice * jitter));

		// Hypothetical mapping: lower price -> higher sales up to a point
		const expectedSalesIncrease = Math.max(-10, Math.min(40, Math.round(((base.price - optimalPrice) / Math.max(1, base.price)) * 100 + (competitorStock > brandStock ? -5 : 5))));
		const margin = Math.max(5, Math.min(45, Math.round((optimalPrice - Math.max(1, optimalPrice * 0.6)) / optimalPrice * 100)));

		recoPrice.textContent = `₹${optimalPrice}`;
		recoSales.textContent = `${expectedSalesIncrease}%`;
		recoMargin.textContent = `${margin}%`;

		// Build price vs predicted sales curve around optimal
		const pricePoints = [];
		for (let i = -4; i <= 4; i++) pricePoints.push(Math.max(1, optimalPrice + i * 2));
		const salesPoints = pricePoints.map(p => Math.max(10, 100 - Math.abs(p - optimalPrice) * 6));

		if (chartInstance) chartInstance.destroy();
		chartInstance = new Chart(chartEl, {
			type: 'line',
			data: {
				labels: pricePoints.map(p => `₹${p}`),
				datasets: [{ label: 'Predicted Sales', data: salesPoints, borderColor: 'rgba(59,130,246,1)', backgroundColor: 'rgba(59,130,246,0.15)', fill: true, tension: 0.35 }]
			},
			options: { responsive: true, plugins: { legend: { display: false }}}
		});
	}

	let current = randomPick();
	runStrategy(current);
	generateBtn.addEventListener('click', () => {
		current = randomPick();
		runStrategy(current);
	});
})();
