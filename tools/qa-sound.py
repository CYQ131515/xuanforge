import json
from playwright.sync_api import sync_playwright

errs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.on("pageerror", lambda e: errs.append(("pageerror", str(e))))
    pg.on("console", lambda m: errs.append((m.type, m.text)) if m.type == "error" else None)
    pg.goto("http://127.0.0.1:8765/", wait_until="networkidle")
    pg.wait_for_timeout(600)
    out = {}
    out["default"] = pg.evaluate("XFSound.debug()")
    out["btn_pressed"] = pg.get_attribute("#btn-sound", "aria-pressed")

    # toggle off then on
    pg.click("#btn-sound"); pg.wait_for_timeout(300)
    out["after_off"] = pg.evaluate("XFSound.debug()")
    pg.click("#btn-sound"); pg.wait_for_timeout(500)
    out["after_on"] = pg.evaluate("XFSound.debug()")

    # ignite
    pg.click("#btn-ignite"); pg.wait_for_timeout(1800)
    out["burning"] = pg.evaluate("XFSound.debug()")
    out["burn_phase"] = pg.inner_text("#phase-main")

    # pause -> resume
    pg.click("#btn-ignite"); pg.wait_for_timeout(400)
    out["paused"] = pg.evaluate("XFSound.debug()")
    pg.click("#btn-ignite"); pg.wait_for_timeout(400)
    out["resumed"] = pg.evaluate("XFSound.debug()")

    # finish -> gong path
    pg.evaluate("XFTrain.jump(0.999)"); pg.wait_for_timeout(1500)
    out["done"] = pg.evaluate("XFSound.debug()")
    out["modal"] = pg.evaluate("!document.getElementById('modal-done').hidden")

    # close modal, then off/on cycles while running
    pg.click("#modal-done .modal__close"); pg.wait_for_timeout(300)
    for i in range(3):
        pg.click("#btn-sound"); pg.wait_for_timeout(120)
    out["toggle_cycles"] = pg.evaluate("XFSound.debug()")

    # volume slider
    pg.click("#btn-guide"); pg.wait_for_timeout(300)
    pg.eval_on_selector("#vol", "el => { el.value = 40; el.dispatchEvent(new Event('input', {bubbles:true})); }")
    pg.wait_for_timeout(250)
    out["volume"] = pg.evaluate("XFSound.getVolume()")
    out["vol_out"] = pg.inner_text("#vol-out")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)

    # audio clock advancing
    t1 = pg.evaluate("XFSound.debug().ctx")
    out["ctx_running"] = t1
    out["errors"] = errs
    b.close()
print(json.dumps(out, ensure_ascii=False, indent=2))
