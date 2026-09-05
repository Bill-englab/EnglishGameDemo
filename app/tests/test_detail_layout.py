"""The served reading surface keeps essential content out of nested disclosures."""
from html.parser import HTMLParser

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
