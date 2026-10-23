import os, sys, json
from playwright.sync_api import sync_playwright

ERRORS = []
URL = "http://127.0.0.1:8765/"

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("console", lambda m: ERRORS.append(("console", m.type, m.text)) if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: ERRORS.append(("pageerror", str(e))))
        page.goto(URL, wait_until="networkidle")
        page.wait_for_timeout(900)

        out = {}
        out["initial_state"] = page.evaluate("document.body.dataset.state")
        out["initial_phase"] = page.inner_text("#phase-main")
        out["canvas_size"] = page.evaluate("[document.getElementById('fx-front').width, document.getElementById('fx-front').height]")
        out["cards_hidden"] = page.evaluate("document.querySelectorAll('.model-card').length")

        # start training
        page.click("#btn-ignite")
        page.wait_for_timeout(2200)
        out["burn_state"] = page.evaluate("document.body.dataset.state")
        out["burn_phase"] = page.inner_text("#phase-main")
        out["burn_temp"] = page.inner_text("#v-temp")
        out["btn_label"] = page.inner_text("#btn-ignite-label")
        out["logs"] = page.evaluate("window.XFTrain.getLogs().length")

        # pause / resume
        page.click("#btn-ignite"); page.wait_for_timeout(400)
        out["paused_phase"] = page.inner_text("#phase-main")
        page.click("#btn-ignite"); page.wait_for_timeout(400)
        out["resumed_phase"] = page.inner_text("#phase-main")

        # nav to codex
        page.click("[data-nav=codex]"); page.wait_for_timeout(500)
        out["codex_cards"] = page.evaluate("document.querySelectorAll('.model-card').length")
        # filter video
        page.click("[data-filter=video]"); page.wait_for_timeout(300)
        out["video_cards"] = page.evaluate("document.querySelectorAll('.model-card').length")
        # search
        page.fill("#codex-search", "wan"); page.wait_for_timeout(300)
        out["search_cards"] = page.evaluate("document.querySelectorAll('.model-card').length")
        # pick a model
        page.click(".model-card [data-pick]"); page.wait_for_timeout(600)
        out["picked_view"] = page.evaluate("document.body.dataset.view")
        out["picked_model"] = page.inner_text("#pick-name")

        # recipes apply
        page.click("[data-nav=recipes]"); page.wait_for_timeout(500)
        out["recipe_cards"] = page.evaluate("document.querySelectorAll('.recipe').length")
        page.click(".recipe [data-apply]"); page.wait_for_timeout(700)
        out["after_apply_model"] = page.inner_text("#pick-name")
        out["after_apply_rank"] = page.input_value("#in-rank")

        # materials view + upload a generated png
        page.click("[data-nav=materials]"); page.wait_for_timeout(500)
        out["materials"] = page.evaluate("document.querySelectorAll('.mat').length")

        # market / methods / logs render
        for v in ["market", "methods", "logs"]:
            page.click(f"[data-nav={v}]"); page.wait_for_timeout(400)
            out[f"view_{v}"] = page.evaluate(f"document.getElementById('view-{v}').innerHTML.length")

        # jump near end -> modal
        page.click("[data-nav=furnace]"); page.wait_for_timeout(300)
        page.evaluate("window.XFTrain.jump(0.999)")
        page.wait_for_timeout(1200)
        out["done_modal"] = page.evaluate("!document.getElementById('modal-done').hidden")
        out["done_file"] = page.inner_text("#lora-file")
        page.click("#modal-done .modal__close"); page.wait_for_timeout(300)
        out["modal_closed"] = page.evaluate("document.getElementById('modal-done').hidden")

        # reset then trial
        page.click("#btn-reset"); page.wait_for_timeout(400)
        out["reset_phase"] = page.inner_text("#phase-main")
        page.click("#btn-trial"); page.wait_for_timeout(2500)
        out["trial_state"] = page.evaluate("document.body.dataset.state")

        # horizontal overflow check at 1440 and 430
        out["overflow_1440"] = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        page.set_viewport_size({"width": 430, "height": 932})
        page.wait_for_timeout(600)
        out["overflow_430"] = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        out["mobile_furnace_w"] = page.evaluate("document.querySelector('.furnace').getBoundingClientRect().width")

        page.screenshot(path="shot-qa-mobile.png", full_page=False)
        browser.close()
        return out

try:
    result = run()
    print(json.dumps(result, ensure_ascii=False, indent=2))
except Exception as e:
    print("QA_FAIL", repr(e))
    print(json.dumps(ERRORS, ensure_ascii=False, indent=2))
    sys.exit(1)

print("ERRORS:", json.dumps(ERRORS, ensure_ascii=False, indent=2))
