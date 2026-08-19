//#region src/lib/decoder/index.js
var e = 6, t = 8, n = 62, r = 63, i = (1 << e) - 1, a = Array.from({ length: e }, (t, n) => r >> e - 1 - n & 1), o = [[
	2349.32,
	2637.02,
	2959.96,
	3322.44
], [
	2349.32,
	2637.02,
	2959.96,
	3322.44
]], s = [[2490.2, 3134.8], [7394, 9313]], c = [...o, ...s], l = c, u = {
	floor: 5e-7,
	on: 6e-4,
	off: 2e-4,
	minToneMs: 40,
	minGapMs: 5,
	ignoreHeadMs: 6,
	envelopeMs: 6,
	hpCutoffHz: 600
}, d = {
	micBase: 1,
	sampleBase: 1,
	gainMultipliers: [
		1,
		2,
		4,
		8,
		16
	]
}, f = .2, p = l.map((e, t) => t === 0 ? .28 : .18), m = "/mb-fesk-worklet.js";
function h() {
	let e = /* @__PURE__ */ new Map();
	return {
		on(t, n) {
			return e.has(t) || e.set(t, /* @__PURE__ */ new Set()), e.get(t).add(n), () => this.off(t, n);
		},
		off(t, n) {
			let r = e.get(t);
			r && (r.delete(n), r.size || e.delete(t));
		},
		once(e, t) {
			let n = this.on(e, (...e) => {
				n(), t(...e);
			});
			return n;
		},
		emit(t, n) {
			let r = e.get(t);
			if (r) for (let e of Array.from(r)) e(n);
		}
	};
}
function g(e) {
	return e >= 0 && e < 26 ? String.fromCharCode(65 + e) : String(e + 1);
}
function _(e) {
	return e.map((e, t) => {
		let n = {
			base: e,
			harmonicMultipliers: [
				1,
				2,
				3,
				4
			],
			detuneFactors: [
				.99,
				1,
				1.01
			]
		};
		return t % 2 == 1 && (n.detuneFactors = [
			.97,
			.985,
			1,
			1.015,
			1.03
		]), n;
	});
}
function v(e, t = {}) {
	let { micBase: n = d.micBase, sampleBase: r = d.sampleBase, gainMultipliers: i = d.gainMultipliers } = t, a = [];
	return e.forEach((e, t) => {
		let o = g(t), s = e.length === 2 ? "BFSK" : "4FSK";
		i.forEach((e, i) => {
			let c = e === 1, l = c ? "" : ` ×${e}`, u = c ? "" : `×${e}`;
			a.push({
				key: `bank-${t}-gain${i}`,
				baseBankIndex: t,
				modulationType: s,
				label: `Bank ${o} (${s})${l}`,
				shortLabel: `${o}${u}`,
				micGain: n * e,
				sampleGain: r * e
			});
		});
	}), a;
}
function y(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	return e.forEach((e) => {
		let i = e.baseBankIndex, a = t?.[i];
		r.set(e.key, Number.isFinite(a) ? a : n);
	}), r;
}
function b(t, n = t.length) {
	let r = [];
	for (let i = 0; i + e <= n; i += e) {
		let n = 0;
		for (let r = 0; r < e; r += 1) n = n << 1 | t[i + r];
		r.push(n);
	}
	return r;
}
function x(e) {
	let t = Array(64).fill(null);
	[
		[0, "a"],
		[1, "b"],
		[2, "c"],
		[3, "d"],
		[4, "e"],
		[5, "f"],
		[6, "g"],
		[7, "h"],
		[8, "i"],
		[9, "j"],
		[10, "k"],
		[11, "l"],
		[12, "m"],
		[13, "n"],
		[14, "o"],
		[15, "p"],
		[16, "q"],
		[17, "r"],
		[18, "s"],
		[19, "t"],
		[20, "u"],
		[21, "v"],
		[22, "w"],
		[23, "x"],
		[24, "y"],
		[25, "z"],
		[26, "0"],
		[27, "1"],
		[28, "2"],
		[29, "3"],
		[30, "4"],
		[31, "5"],
		[32, "6"],
		[33, "7"],
		[34, "8"],
		[35, "9"],
		[36, " "],
		[37, ","],
		[38, ":"],
		[39, "'"],
		[40, "\""],
		[41, "\n"]
	].forEach(([e, n]) => {
		t[e] = n;
	});
	let n = [];
	for (let r = 0; r < e.length; r += 1) {
		let i = e[r], a = t[i];
		if (typeof a != "string") return {
			ok: !1,
			text: null,
			err: `unsupported code ${i} at index ${r}`
		};
		n.push(a);
	}
	return {
		ok: !0,
		text: n.join("")
	};
}
function S(t) {
	let n = 0;
	for (let r of t) for (let t = e - 1; t >= 0; --t) {
		let e = r >> t & 1, i = n >> 7 & 1 ^ e;
		n = n << 1 & 255, i && (n ^= 7);
	}
	return n;
}
function C(e) {
	let t = 0;
	for (let n = 0; n < e.length; n += 1) t = t << 1 | e[n];
	return t;
}
function w(e = {}) {
	let t = e.freqSets ?? l, n = e.detectorConfig ?? _(t), r = {
		...d,
		...e.gainConfig || {}
	}, i = e.pipelineDefs ?? v(t, {
		...e.pipelineOptions,
		...r
	}), a = e.scoreMin ?? f, o = e.scoreMinBank ?? p, s = e.pipelineThresholds ?? y(i, o, a);
	return {
		freqSets: t,
		detectorConfig: n,
		energy: {
			...u,
			...e.energy || {}
		},
		pipelineDefs: i,
		pipelineThresholds: s,
		scoreMin: a,
		scoreMinBank: o,
		workletUrl: e.workletUrl ?? m,
		autoStopOnFrame: !!e.autoStopOnFrame
	};
}
function T(r = {}) {
	let o = w(r), s = h(), c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Set(), u = /* @__PURE__ */ new Map(), d = null, p = null, m = null, g = !1, _ = !1, v = /* @__PURE__ */ new Map();
	function y(e, t) {
		return {
			state: "hunt",
			frameBits: [],
			bitScores: [],
			frameScoreSum: 0,
			frameScoreCount: 0,
			avgConfidence: 0,
			lastUpdatedAt: null,
			markerBits: [],
			markerScores: [],
			recentBits: 0,
			recentCount: 0,
			previewText: "",
			previewConfidence: 0,
			previewUpdatedAt: null,
			previewConsumedBits: 0,
			previewActive: !1,
			pipelineKey: e,
			label: t
		};
	}
	function T(e, t) {
		s.emit("preview", {
			pipelineKey: e,
			...t
		});
	}
	function E(e) {
		e.previewActive || (e.previewActive = !0, e.previewText = "", e.previewConfidence = 0, e.previewUpdatedAt = null, e.previewConsumedBits = 0, T(e.pipelineKey, {
			text: "",
			provisional: !0
		}));
	}
	function D(t) {
		if (!t.frameBits.length) return null;
		let n = t.frameBits.length - t.frameBits.length % e;
		if (!n || n <= t.previewConsumedBits) return null;
		let r = x(b(t.frameBits, n));
		return r.ok ? {
			text: r.text,
			confidence: t.avgConfidence,
			crcOk: null,
			updatedAt: t.lastUpdatedAt,
			consumedBits: n
		} : null;
	}
	function O(e, t) {
		if (!t || typeof t.text != "string") return;
		E(e);
		let n = t.text !== e.previewText, r = t.confidence !== e.previewConfidence, i = t.updatedAt !== e.previewUpdatedAt;
		e.previewText = t.text, e.previewConfidence = t.confidence, e.previewUpdatedAt = t.updatedAt ?? null, (n || r || i) && T(e.pipelineKey, {
			text: e.previewText,
			provisional: !0,
			confidence: e.previewConfidence,
			crcOk: t.crcOk,
			updatedAt: e.previewUpdatedAt
		}), Number.isFinite(t.consumedBits) && (e.previewConsumedBits = t.consumedBits);
	}
	function k(e, t) {
		e.frameScoreSum += Number.isFinite(t) ? t : 0, e.frameScoreCount += 1, e.avgConfidence = e.frameScoreCount ? e.frameScoreSum / e.frameScoreCount : 0, e.lastUpdatedAt = Date.now();
	}
	function A(e, t) {
		let n = !!t?.text && t?.crcOk === !0;
		e.previewActive ? n ? T(e.pipelineKey, {
			text: t.text,
			provisional: !1,
			confidence: t.confidence,
			crcOk: t.crcOk,
			updatedAt: t.updatedAt
		}) : T(e.pipelineKey, {
			text: null,
			provisional: !1
		}) : n && T(e.pipelineKey, {
			text: t.text,
			provisional: !1,
			confidence: t.confidence,
			crcOk: t.crcOk,
			updatedAt: t.updatedAt
		}), e.previewActive = !1, e.previewText = "", e.previewConsumedBits = 0;
	}
	function j(e) {
		e.state = "hunt", e.frameBits.length = 0, e.bitScores.length = 0, e.frameScoreSum = 0, e.frameScoreCount = 0, e.avgConfidence = 0, e.lastUpdatedAt = null, e.markerBits.length = 0, e.markerScores.length = 0, e.recentBits = 0, e.recentCount = 0, e.previewText = "", e.previewConfidence = 0, e.previewUpdatedAt = null, e.previewConsumedBits = 0, e.previewActive && T(e.pipelineKey, {
			text: null,
			provisional: !1
		}), e.previewActive = !1;
	}
	function M() {
		for (let e of v.values()) j(e);
	}
	function N(n) {
		let r = n.frameBits.length, i = n.avgConfidence;
		if (r < t) {
			let e = {
				ok: !1,
				crcOk: !1,
				text: null,
				confidence: i,
				status: "short",
				updatedAt: n.lastUpdatedAt
			};
			return A(n, e), e;
		}
		let a = r - t;
		if (a < 0 || a % e !== 0) {
			let e = {
				ok: !1,
				crcOk: !1,
				text: null,
				confidence: i,
				status: "misaligned",
				updatedAt: n.lastUpdatedAt
			};
			return A(n, e), e;
		}
		let o = b(n.frameBits, a), s = C(n.frameBits.slice(a, a + t)) === S(o), c = !1, l = null;
		if (s) {
			let e = x(o);
			c = e.ok, l = e.text;
		}
		let u = n.bitScores.slice(0, a), d = u.length ? u.reduce((e, t) => e + t, 0) / u.length : i;
		n.markerBits.length = 0, n.markerScores.length = 0;
		let f = {
			ok: c,
			crcOk: s,
			text: l,
			confidence: d,
			status: s ? c ? "ok" : "decode-fail" : "crc-fail",
			updatedAt: n.lastUpdatedAt
		};
		return A(n, f), f;
	}
	function P(r, o, s) {
		let c = s ?? 0;
		if (r.state === "hunt") return r.recentBits = (r.recentBits << 1 | o) & i, r.recentCount = Math.min(r.recentCount + 1, e), r.recentCount === e && r.recentBits === n && (r.state = "payload", r.frameBits.length = 0, r.bitScores.length = 0, r.frameScoreSum = 0, r.frameScoreCount = 0, r.avgConfidence = 0, r.lastUpdatedAt = null, r.previewText = "", r.previewConfidence = 0, r.previewUpdatedAt = null, r.previewConsumedBits = 0, r.previewActive = !1, r.recentBits = 0, r.recentCount = 0), null;
		if (r.state !== "payload") return null;
		r.markerBits.push(o), r.markerScores.push(c);
		let l = !1;
		for (; r.markerBits.length;) {
			let e = !0;
			for (let t = 0; t < r.markerBits.length; t += 1) if (r.markerBits[t] !== a[t]) {
				e = !1;
				break;
			}
			if (e) break;
			let t = r.markerBits.shift(), n = r.markerScores.shift();
			r.frameBits.push(t), r.bitScores.push(n), k(r, n);
			let i = D(r);
			i && O(r, i), l = !0;
		}
		for (; r.markerBits.length >= e;) {
			let n = r.frameBits.length - t;
			if (n < 0 || n % e !== 0) {
				let e = r.markerBits.shift(), t = r.markerScores.shift();
				r.frameBits.push(e), r.bitScores.push(t), k(r, t);
				let n = D(r);
				n && O(r, n);
				continue;
			}
			let i = N(r);
			return j(r), i;
		}
		if (r.recentBits = (r.recentBits << 1 | o) & i, r.recentCount = Math.min(r.recentCount + 1, e), !r.markerBits.length && !l) {
			let e = D(r);
			e && O(r, e);
		}
		return null;
	}
	function F(e, t, n, r) {
		if (r === "BFSK") return t < 0 || t > 1 ? null : P(e, t, n);
		{
			if (t < 0 || t > 3) return null;
			let r = t >> 1 & 1, i = t & 1;
			return P(e, r, n) || P(e, i, n);
		}
	}
	function I() {
		if (!c.size) return !1;
		for (let e of c.values()) if (!e.ready) return !1;
		return !0;
	}
	function L() {
		if (l.size && I()) {
			for (let e of l) e();
			l.clear();
		}
	}
	function R() {
		return I() ? Promise.resolve() : new Promise((e) => {
			l.add(e);
		});
	}
	function z(e, t) {
		for (let n of c.values()) try {
			let r = t === "sample" ? n.sampleGainNode : n.micGainNode;
			e.connect(r);
		} catch (e) {
			console.warn(`[${n.def.label}] connect failed`, e?.message || e);
		}
	}
	function B(e, t) {
		for (let n of c.values()) try {
			let r = t === "sample" ? n.sampleGainNode : n.micGainNode;
			e.disconnect(r);
		} catch {}
	}
	function V(e) {
		s.emit("state", e);
	}
	function H(e, t) {
		let n = o.freqSets, r = o.pipelineThresholds.get(e.key) ?? f, i = v.get(e.key);
		if (!i) return;
		if (!Array.isArray(t) || !t.length) {
			V({
				kind: "freq",
				pipelineKey: e.key,
				freqHz: null
			}), V({
				kind: "pipeline-status",
				pipelineKey: e.key,
				status: "idle"
			});
			return;
		}
		let a = !1, c = !1, l = null, d = n[e.baseBankIndex] || [];
		for (let n of t) {
			if (!n || !n.active) continue;
			if (a = !0, Number.isFinite(n.idx)) {
				let t = u.get(e.key);
				t || (t = [], u.set(e.key, t)), t.push(n.idx);
			}
			let t = Number.isFinite(n.freqHz) && n.freqHz > 0 ? n.freqHz : Number.isFinite(d[n.idx]) ? d[n.idx] : null;
			if (V({
				kind: "freq",
				pipelineKey: e.key,
				freqHz: t
			}), (n.score ?? 0) < r) continue;
			let f = Number.isFinite(n.idx) ? F(i, n.idx, n.score, e.modulationType) : null;
			f && (s.emit("frame", {
				pipelineKey: e.key,
				label: e.label,
				result: f
			}), f.ok && f.crcOk && f.text ? (V({
				kind: "pipeline-status",
				pipelineKey: e.key,
				status: "frame OK"
			}), g || V({
				kind: "status",
				status: `frame OK (${e.label})`
			}), c = !0, l = null, o.autoStopOnFrame && !_ && (_ = !0, queueMicrotask(() => {
				J({ status: "auto-stopped" }).catch((e) => {
					_ = !1, console.error("Auto-stop failed", e);
				});
			}))) : f.crcOk ? f.ok || (V({
				kind: "pipeline-status",
				pipelineKey: e.key,
				status: "decode fail"
			}), !c && !l && (l = `frame decode fail (${e.label})`)) : (V({
				kind: "pipeline-status",
				pipelineKey: e.key,
				status: "CRC fail"
			}), !c && !l && (l = `frame CRC fail (${e.label})`)));
		}
		a ? !c && typeof l == "string" && V({
			kind: "status",
			status: l
		}) : (V({
			kind: "freq",
			pipelineKey: e.key,
			freqHz: null
		}), V({
			kind: "pipeline-status",
			pipelineKey: e.key,
			status: "idle"
		}));
	}
	function U(e, t) {
		if (!t) return;
		let n = e.def;
		if (t.pipeline && t.pipeline !== n.key) {
			console.warn(`[${n.label}] ignoring message for ${t.pipeline}`);
			return;
		}
		if (t.t === "ready") {
			e.ready = !0;
			let r = Number.isFinite(t.sr) && t.sr > 0 ? `${Math.round(t.sr)} Hz` : "";
			V({
				kind: "pipeline-status",
				pipelineKey: n.key,
				status: r ? `ready (${r})` : "ready"
			}), !g && I() && V({
				kind: "status",
				status: "ready"
			}), L();
			return;
		}
		if (t.t === "candidates") {
			H(n, t.results);
			return;
		}
	}
	function W(e) {
		return e instanceof URL ? e : typeof e == "function" ? e() : new URL(e, import.meta.url);
	}
	async function G(e = {}) {
		g = !!e?.suppressReadyStatus, _ = !1, M(), l.clear(), u.clear(), V({
			kind: "status",
			status: "initializing audio…"
		});
		let t = e?.sampleRate, n = { latencyHint: "interactive" };
		t ? (n.sampleRate = t, console.info(`Creating AudioContext with requested sample rate: ${t} Hz`)) : console.info("Creating AudioContext with browser default sample rate"), d = new (window.AudioContext || window.webkitAudioContext)(n), console.info(`AudioContext created - actual sample rate: ${d.sampleRate} Hz`), t && t !== d.sampleRate && console.warn(`AudioContext sample rate mismatch! Requested ${t} Hz but got ${d.sampleRate} Hz`), V({
			kind: "sample-rate",
			sampleRate: d.sampleRate
		});
		let r = W(o.workletUrl);
		await d.audioWorklet.addModule(r), c.clear(), v.clear();
		for (let e of o.pipelineDefs) {
			let t = new AudioWorkletNode(d, "mb-fesk", {
				numberOfInputs: 1,
				numberOfOutputs: 0,
				channelCount: 1,
				channelCountMode: "explicit",
				channelInterpretation: "speakers"
			}), n = d.createGain(), r = d.createGain();
			n.channelCount = 1, n.channelCountMode = "explicit", n.channelInterpretation = "speakers", r.channelCount = 1, r.channelCountMode = "explicit", r.channelInterpretation = "speakers", n.gain.value = Number.isFinite(e.micGain) && e.micGain > 0 ? e.micGain : 1, r.gain.value = Number.isFinite(e.sampleGain) && e.sampleGain > 0 ? e.sampleGain : 1, n.connect(t), r.connect(t);
			let i = {
				def: e,
				workletNode: t,
				micGainNode: n,
				sampleGainNode: r,
				ready: !1
			};
			c.set(e.key, i), v.set(e.key, y(e.key, e.label)), t.port.onmessage = (e) => U(i, e.data), t.port.postMessage({
				pipelineKey: e.key,
				freqSets: [o.detectorConfig[e.baseBankIndex]],
				energyFloor: o.energy.floor,
				energyOn: o.energy.on,
				energyOff: o.energy.off,
				minToneMs: o.energy.minToneMs,
				minGapMs: o.energy.minGapMs,
				ignoreHeadMs: o.energy.ignoreHeadMs,
				envelopeMs: o.energy.envelopeMs,
				hpCutoffHz: o.energy.hpCutoffHz
			}), V({
				kind: "pipeline-status",
				pipelineKey: e.key,
				status: "initializing…"
			});
		}
	}
	async function K(e) {
		if (d || (await G(), await R()), p) {
			B(p, "mic");
			try {
				p.disconnect();
			} catch {}
		}
		console.info(`Creating MediaStreamSource - AudioContext sample rate: ${d.sampleRate} Hz`);
		let t = e.getAudioTracks();
		if (t.length > 0) {
			let e = t[0].getSettings();
			console.info(`Stream audio track sample rate: ${e.sampleRate} Hz`);
		}
		p = d.createMediaStreamSource(e), p.channelCount = 1, p.channelCountMode = "explicit", p.channelInterpretation = "speakers", console.info("MediaStreamSource created successfully"), z(p, "mic");
		for (let e of c.values()) V({
			kind: "pipeline-status",
			pipelineKey: e.def.key,
			status: "listening…"
		});
		return V({
			kind: "status",
			status: "listening… wait for 111110 start marker"
		}), p;
	}
	async function q(e, t = {}) {
		if (d || (await G({ suppressReadyStatus: t?.suppressReadyStatus }), await R()), m) {
			m.onended = null;
			try {
				m.stop();
			} catch {}
			B(m, "sample");
			try {
				m.disconnect();
			} catch {}
		}
		m = d.createBufferSource(), m.buffer = e, z(m, "sample");
		let n = t?.label ? ` ${t.label}` : "";
		for (let e of c.values()) V({
			kind: "pipeline-status",
			pipelineKey: e.def.key,
			status: `sample${n}…`.trim()
		});
		return V({
			kind: "status",
			status: `playing sample${n}…`
		}), m.onended = () => {
			B(m, "sample"), m = null, V({
				kind: "buffer-ended",
				label: t?.label || ""
			});
		}, m.start(), m;
	}
	async function J(e = {}) {
		let { status: t } = e || {};
		if (l.forEach((e) => e()), l.clear(), m) {
			m.onended = null;
			try {
				m.stop();
			} catch {}
			B(m, "sample");
			try {
				m.disconnect();
			} catch {}
			m = null;
		}
		if (p) {
			B(p, "mic");
			try {
				p.disconnect();
			} catch {}
			p = null;
		}
		for (let e of c.values()) {
			e.ready = !1;
			try {
				e.micGainNode.disconnect();
			} catch {}
			try {
				e.sampleGainNode.disconnect();
			} catch {}
			try {
				e.workletNode.disconnect();
			} catch {}
			e.workletNode.port.onmessage = null;
		}
		if (c.clear(), d) {
			try {
				await d.close();
			} catch {}
			d = null;
		}
		M(), g = !1, _ = !1, V({
			kind: "sample-rate",
			sampleRate: null
		}), typeof t == "string" && V({
			kind: "status",
			status: t
		});
	}
	function Y() {
		let e = /* @__PURE__ */ new Map();
		for (let [t, n] of u.entries()) e.set(t, [...n]);
		return u.clear(), e;
	}
	return {
		config: o,
		events: s,
		prepare: G,
		attachStream: K,
		attachBuffer: q,
		waitForReady: R,
		stop: J,
		drainToneLog: Y,
		getAudioContext: () => d
	};
}
var E = w(), D = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", O = new Int16Array(91).fill(-1);
for (let e = 0; e < 32; e++) O[D.charCodeAt(e)] = e;
function k(e) {
	let t = e.toUpperCase().replace(/[=\s]/g, "");
	if (t.length === 0) return null;
	let n = [], r = 0, i = 0;
	for (let e = 0; e < t.length; e++) {
		let a = t.charCodeAt(e);
		if (a >= O.length) return null;
		let o = O[a];
		if (o === -1) return null;
		i = i << 5 | o, r += 5, r >= 8 && (n.push(i >>> r - 8 & 255), r -= 8);
	}
	return n.length === 0 ? null : new Uint8Array(n);
}
function A(e) {
	let t = e.length >= 8 && e[0] === 137 && e[1] === 80 && e[2] === 78 && e[3] === 71 && e[4] === 13 && e[5] === 10 && e[6] === 26 && e[7] === 10, n = e.length >= 12 && e[0] === 82 && e[1] === 73 && e[2] === 70 && e[3] === 70 && e[8] === 87 && e[9] === 69 && e[10] === 66 && e[11] === 80;
	return t ? "PNG" : n ? "WebP" : null;
}
function j(e) {
	return e === 9 || e === 10 || e === 13 ? !0 : !(e < 32 || e >= 127 && e <= 159);
}
function M(e) {
	let t = Array.from(e);
	if (t.length === 0) return !0;
	let n = 0;
	for (let e of t) {
		let t = e.codePointAt(0);
		t != null && j(t) && (n += 1);
	}
	return n / t.length >= .95;
}
function N(e) {
	try {
		let t = k(e);
		if (!t || A(t)) return null;
		let n = new TextDecoder("utf-8", { fatal: !0 }).decode(t);
		return M(n) ? n : null;
	} catch {
		return null;
	}
}
function P(e) {
	let t = k(e);
	if (!t) return null;
	let n = A(t);
	return n ? {
		bytes: t,
		format: n,
		mimeType: n === "PNG" ? "image/png" : "image/webp"
	} : null;
}
//#endregion
//#region src/lib/index.ts
function F(e) {
	if (!e || e.workletUrl == null) throw Error("createFeskDecoder: `workletUrl` is required. Copy `mb-fesk-worklet.js` from the package into a location served by your app and pass its URL (string, URL, or `() => URL`).");
	return T(e);
}
//#endregion
export { s as BFSK_FREQS_SETS, E as DEFAULT_FESK_DECODER_CONFIG, o as FREQS_SETS_4FSK, c as HYBRID_FREQS_SETS, F as createFeskDecoder, k as decodeBase32ToBytes, A as hasKnownImageSignature, P as tryDecodeAsBase32Image, N as tryDecodeBase32Text };
