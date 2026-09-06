"""The served reading surface keeps essential content out of nested disclosures."""
from html.parser import HTMLParser
import re

from tests.test_app import app_env, client  # noqa: F401 -- reuse isolated route fixtures


class Document(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.stack = []
        self.nodes = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = {"tag": tag, "attrs": dict(attrs), "parents": list(self.stack)}
        self.nodes.append(node)
        if tag not in {"meta", "link", "img", "input", "br", "hr", "source"}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index]["tag"] == tag:
                self.stack = self.stack[:index]
                return

    def by_id(self, identity):
        return next(node for node in self.nodes if node["attrs"].get("id") == identity)


def test_detail_prioritizes_performance_before_demo_and_reading_before_replay(client):
    page = Document(client.get("/").get_data(as_text=True))
    order = [node["attrs"].get("id") for node in page.nodes]
    assert order.index("detail-perf") < order.index("detail-demo")
    assert order.index("detail-demo") < order.index("detail-dialogue") < order.index("detail-replay-cards")
    for identity in ["detail-dialogue", "detail-replay-cards"]:
        assert not any(parent["tag"] == "details" for parent in page.by_id(identity)["parents"])


def test_grownup_metadata_and_prompts_are_collapsed_outside_toolbar(client):
    page = Document(client.get("/").get_data(as_text=True))
    for identity in ["detail-can-do", "detail-trigger", "detail-patterns", "detail-parent-support", "detail-prompts"]:
        parents = page.by_id(identity)["parents"]
        disclosures = [parent for parent in parents if parent["tag"] == "details"]
        assert disclosures and all("open" not in node["attrs"] for node in disclosures)
        assert not any("detail-header" in parent["attrs"].get("class", "").split() for parent in parents)


def test_mobile_tabs_are_named_and_connected_to_panels(client):
    page = Document(client.get("/").get_data(as_text=True))
    tabs = [node for node in page.nodes if node["attrs"].get("role") == "tab"]
    assert len(tabs) == 2
    assert [tab["attrs"].get("aria-selected") for tab in tabs] == ["true", "false"]
    for tab in tabs:
        panel = page.by_id(tab["attrs"]["aria-controls"])
        assert panel["attrs"]["aria-labelledby"] == tab["attrs"]["id"]


def test_course_drawer_has_connected_modal_controls_and_stable_window_mounts(client):
    page = Document(client.get("/").get_data(as_text=True))
    trigger = page.by_id("adventure-menu-button")
    assert trigger["tag"] == "button"
    assert trigger["attrs"]["aria-controls"] == "course-drawer"
    assert trigger["attrs"]["aria-expanded"] == "false"
    drawer = page.by_id("course-drawer")
    assert drawer["attrs"]["role"] == "dialog"
    assert drawer["attrs"]["aria-modal"] == "true"
    assert page.by_id(drawer["attrs"]["aria-labelledby"])
    assert "hidden" in drawer["attrs"]
    assert "hidden" in page.by_id("drawer-backdrop")["attrs"]
    assert page.by_id("course-drawer-close")["tag"] == "button"
    current = page.by_id("current-lesson-button")
    assert "hidden" in current["attrs"] and "disabled" in current["attrs"]
    mounts = [node for node in page.nodes if "data-window-controls" in node["attrs"]]
    assert len(mounts) == 2
    assert any(parent["attrs"].get("id") == "map-view" for parent in mounts[0]["parents"])
    assert any(parent["attrs"].get("id") == "detail-view" for parent in mounts[1]["parents"])
    # The modal must be outside the map that becomes inert while it is open.
    assert not any(parent["attrs"].get("id") == "map-view" for parent in drawer["parents"])


def test_account_menu_has_a_name_independent_of_mobile_hidden_username(client):
    page = Document(client.get("/").get_data(as_text=True))
    trigger = page.by_id("user-menu-trigger")
    assert trigger["tag"] == "button"
    # Mobile hides the username; the decorative avatar cannot name the control.
    assert page.by_id("user-avatar")["attrs"]["alt"] == ""
    assert trigger["attrs"].get("aria-label") == "Open account menu"


def test_map_shell_groups_progress_and_account_as_one_reference_composition(client):
    """The avatar overlaps the centered progress group while window controls stay right."""
    page = Document(client.get("/").get_data(as_text=True))
    topbar = next(node for node in page.nodes if "topbar" in node["attrs"].get("class", "").split())
    direct_children = [node for node in page.nodes if node["parents"] and node["parents"][-1] is topbar]
    assert [node["attrs"].get("class") for node in direct_children] == [
        "shell-left", "shell-progress", "shell-actions",
    ]
    cells = {node["attrs"]["class"]: node for node in direct_children}
    brand = next(node for node in page.nodes if "adventure-brand" in node["attrs"].get("class", "").split())
    progress = next(node for node in page.nodes if "progress" in node["attrs"].get("class", "").split())
    account = page.by_id("user-menu")
    mounts = [node for node in page.nodes if "data-window-controls" in node["attrs"]]
    assert brand["parents"][-1] is cells["shell-left"]
    assert progress["parents"][-1] is cells["shell-progress"]
    assert account["parents"][-1] is cells["shell-progress"]
    assert mounts[0]["parents"][-1] is cells["shell-actions"]


def test_detail_keeps_two_independent_closed_disclosures_after_complete_reading(client):
    page = Document(client.get("/").get_data(as_text=True))
    disclosures = [node for node in page.nodes if "detail-disclosure" in node["attrs"].get("class", "").split()]
    assert len(disclosures) == 2
    for node in disclosures:
        assert node["tag"] == "details" and "open" not in node["attrs"]
        assert not any(parent["tag"] == "details" for parent in node["parents"])
        assert page.nodes.index(page.by_id("detail-replay-cards")) < page.nodes.index(node)


def test_toy_tokens_are_shared_by_detail_shell_and_profile(client):
    css = client.get("/static/style.css").get_data(as_text=True)
    for token, value in {
        "ivory": "#fffaf2", "cocoa": "#402b20", "teal": "#267f7b",
        "apricot": "#ffddb0", "line": "#ded2c3",
    }.items():
        assert f"--toy-{token}: {value}" in css
    for alias, token in {"shell-surface": "ivory", "shell-ink": "cocoa", "shell-accent": "teal", "shell-line": "line"}.items():
        assert f"--{alias}: var(--toy-{token})" in css
    profile = client.get("/static/profile.css").get_data(as_text=True)
    assert "var(--toy-teal)" in profile and "var(--toy-ivory)" in profile


def test_detail_toolbar_and_mobile_media_use_accepted_breakpoint(client):
    css = client.get("/static/style.css").get_data(as_text=True)
    assert re.search(r"\.detail-header\s*\{[^}]*min-height:\s*56px", css)
    assert "grid-template-columns: 340px minmax(0, 1fr)" in css
    js = client.get("/static/app.js").get_data(as_text=True)
    assert 'mobileMedia = window.matchMedia("(max-width: 767px)")' in js
    assert "@media (max-width: 899px)" not in css


def test_account_pages_share_tokens_and_keep_electron_controls(client):
    for path in ["/login", "/admin"]:
        if path == "/admin":
            with client.session_transaction() as session:
                session["username"] = "admin"
        html = client.get(path).get_data(as_text=True)
        assert "var(--toy-teal)" in html
        assert '<script src="/static/titlebar.js"></script>' in html
        assert "overflow-y: auto" in html
