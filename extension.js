var h4FS, h4FW, h4FSt;
var h5FS, h5FW, h5FSt;
var h6FS, h6FW, h6FSt;
var h4FV, h5FV, h6FV;
var h4Tag, h5Tag, h6Tag;

export default {
    onload: ({ extensionAPI }) => {
        const config = {
            tabTitle: "Augmented Headings",
            settings: [
                {
                    id: "h4-tag",
                    name: "H4 Tag",
                    description: "Preferred tag to recognise as H4",
                    action: {
                        type: "input", placeholder: "h4",
                        onChange: (evt) => { setTags(evt, 1); }
                    },
                },
                {
                    id: "h4-fontSize",
                    name: "H4 Font Size",
                    description: "Font Size for your H4 headings, as an integer",
                    action: {
                        type: "input", placeholder: "16",
                        onChange: (evt) => { setFonts(evt, 1); }
                    },
                },
                {
                    id: "h4-fontWeight",
                    name: "H4 Font Weight",
                    description: "Font Weight for your H4 headings",
                    action: { type: "select", items: ["400", "100", "200", "300", "500", "600", "700", "800", "900"], onChange: (evt) => { setFonts(evt, 2); } },
                },
                {
                    id: "h4-fontStyle",
                    name: "H4 Font Style",
                    description: "Font Style for your H4 Headings",
                    action: { type: "select", items: ["normal", "italic", "oblique"], onChange: (evt) => { setFonts(evt, 3); } },
                },
                {
                    id: "h4-fontVar",
                    name: "H4 Font Variant",
                    description: "Font Variant for your H4 Headings",
                    action: { type: "select", items: ["normal", "small-caps", "all-small-caps", "unicase"], onChange: (evt) => { setFonts(evt, 10); } },
                },
                {
                    id: "h5-tag",
                    name: "H5 Tag",
                    description: "Preferred tag to recognise as H5",
                    action: {
                        type: "input", placeholder: "h5",
                        onChange: (evt) => { setTags(evt, 2); }
                    },
                },
                {
                    id: "h5-fontSize",
                    name: "H5 Font Size",
                    description: "Font Size for your H5 headings, as an integer",
                    action: {
                        type: "input", placeholder: "14",
                        onChange: (evt) => { setFonts(evt, 4); }
                    },
                },
                {
                    id: "h5-fontWeight",
                    name: "H5 Font Weight",
                    description: "Font Weight for your H5 headings",
                    action: { type: "select", items: ["400", "100", "200", "300", "500", "600", "700", "800", "900"], onChange: (evt) => { setFonts(evt, 5); } },
                },
                {
                    id: "h5-fontStyle",
                    name: "H5 Font Style",
                    description: "Font Style for your H5 Headings",
                    action: { type: "select", items: ["normal", "italic", "oblique"], onChange: (evt) => { setFonts(evt, 6); } },
                },
                {
                    id: "h5-fontVar",
                    name: "H5 Font Variant",
                    description: "Font Variant for your H5 Headings",
                    action: { type: "select", items: ["normal", "small-caps", "all-small-caps", "unicase"], onChange: (evt) => { setFonts(evt, 11); } },
                },
                {
                    id: "h6-tag",
                    name: "H6 Tag",
                    description: "Preferred tag to recognise as H6",
                    action: {
                        type: "input", placeholder: "h6",
                        onChange: (evt) => { setTags(evt, 3); }
                    },
                },
                {
                    id: "h6-fontSize",
                    name: "H6 Font Size",
                    description: "Font Size for your H6 headings, as an integer",
                    action: {
                        type: "input", placeholder: "12",
                        onChange: (evt) => { setFonts(evt, 7); }
                    },
                },
                {
                    id: "h6-fontWeight",
                    name: "H6 Font Weight",
                    description: "Font Weight for your H6 headings",
                    action: { type: "select", items: ["400", "100", "200", "300", "500", "600", "700", "800", "900"], onChange: (evt) => { setFonts(evt, 8); } },
                },
                {
                    id: "h6-fontStyle",
                    name: "H6 Font Style",
                    description: "Font Style for your H6 Headings",
                    action: { type: "select", items: ["normal", "italic", "oblique"], onChange: (evt) => { setFonts(evt, 9); } },
                },
                {
                    id: "h6-fontVar",
                    name: "H6 Font Variant",
                    description: "Font Variant for your H6 Headings",
                    action: { type: "select", items: ["normal", "small-caps", "all-small-caps", "unicase"], onChange: (evt) => { setFonts(evt, 12); } },
                },
            ]
        };
        extensionAPI.settings.panel.create(config);

        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "Toggle Heading - H4",
            callback: () => {
                const uid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
                var level = "h4";
                toggleHeading(uid, level);
            }
        });
        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "Toggle Heading - H5",
            callback: () => {
                const uid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
                var level = "h5";
                toggleHeading(uid, level);
            }
        });
        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "Toggle Heading - H6",
            callback: () => {
                const uid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
                var level = "h6";
                toggleHeading(uid, level);
            }
        });

        window.roamAlphaAPI.ui.blockContextMenu.addCommand({
            label: "Toggle Heading - H4",
            callback: (e) => {
                const uid = e["block-uid"];
                var level = "h4";
                toggleHeading(uid, level);
            }
        });
        window.roamAlphaAPI.ui.blockContextMenu.addCommand({
            label: "Toggle Heading - H5",
            callback: (e) => {
                const uid = e["block-uid"];
                var level = "h5";
                toggleHeading(uid, level);
            }
        });
        window.roamAlphaAPI.ui.blockContextMenu.addCommand({
            label: "Toggle Heading - H6",
            callback: (e) => {
                const uid = e["block-uid"];
                var level = "h6";
                toggleHeading(uid, level);
            }
        });

        // onload
        if (!extensionAPI.settings.get("h4-tag")) {
            h4Tag = "h4";
            localStorage.setItem("augmented_headings:h4", h4Tag);
        } else {
            h4Tag = extensionAPI.settings.get("h4-tag");
            localStorage.setItem("augmented_headings:h4", h4Tag);
        }
        if (!extensionAPI.settings.get("h4-fontSize")) {
            h4FS = "16";
        } else {
            h4FS = extensionAPI.settings.get("h4-fontSize");
        }
        h4FW = extensionAPI.settings.get("h4-fontWeight");
        h4FSt = extensionAPI.settings.get("h4-fontStyle");
        h4FV = extensionAPI.settings.get("h4-fontVar");
        if (!extensionAPI.settings.get("h5-tag")) {
            h5Tag = "h5";
            localStorage.setItem("augmented_headings:h5", h5Tag);
        } else {
            h5Tag = extensionAPI.settings.get("h5-tag");
            localStorage.setItem("augmented_headings:h5", h5Tag);
        }
        if (!extensionAPI.settings.get("h5-fontSize")) {
            h5FS = "14";
        } else {
            h5FS = extensionAPI.settings.get("h5-fontSize");
        }
        h5FW = extensionAPI.settings.get("h5-fontWeight");
        h5FSt = extensionAPI.settings.get("h5-fontStyle");
        h5FV = extensionAPI.settings.get("h5-fontVar");
        if (!extensionAPI.settings.get("h6-tag")) {
            h6Tag = "h6";
            localStorage.setItem("augmented_headings:h6", h6Tag);
        } else {
            h6Tag = extensionAPI.settings.get("h6-tag");
            localStorage.setItem("augmented_headings:h6", h6Tag);
        }
        if (!extensionAPI.settings.get("h6-fontSize")) {
            h6FS = "12";
        } else {
            h6FS = extensionAPI.settings.get("h6-fontSize");
        }
        h6FW = extensionAPI.settings.get("h6-fontWeight");
        h6FSt = extensionAPI.settings.get("h6-fontStyle");
        h6FV = extensionAPI.settings.get("h6-fontVar");

        // on change in settings
        function setTags(evt, i) {
            if (i == 1) {
                h4Tag = evt.target.value;
                localStorage.setItem("augmented_headings:h4", h4Tag);
            } else if (i == 2) {
                h5Tag = evt.target.value;
                localStorage.setItem("augmented_headings:h5", h5Tag);
            } else if (i == 3) {
                h6Tag = evt.target.value
                localStorage.setItem("augmented_headings:h6", h6Tag);
            }
            headingsCSS();
        }
        function setFonts(evt, i) {
            if (i == 1) {
                h4FS = evt.target.value;
            } else if (i == 2) {
                h4FW = evt;
            } else if (i == 3) {
                h4FSt = evt
            } else if (i == 4) {
                h5FS = evt.target.value;
            } else if (i == 5) {
                h5FW = evt;
            } else if (i == 6) {
                h5FSt = evt;
            } else if (i == 7) {
                h6FS = evt.target.value;
            } else if (i == 8) {
                h6FW = evt;
            } else if (i == 9) {
                h6FSt = evt;
            } else if (i == 10) {
                h4FV = evt;
            } else if (i == 11) {
                h5FV = evt;
            } else if (i == 12) {
                h6FV = evt;
            }
            headingsCSS();
        }

        headingsCSS();
    },
    onunload: () => {
        var head = document.getElementsByTagName("head")[0];
        if (document.getElementById("headings-css")) {
            var cssStyles = document.getElementById("headings-css");
            head.removeChild(cssStyles);
        }
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'Toggle Heading - H4'
        });
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'Toggle Heading - H5'
        });
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'Toggle Heading - H6'
        });
        window.roamAlphaAPI.ui.blockContextMenu.removeCommand({
            label: 'Toggle Heading - H4'
        });
        window.roamAlphaAPI.ui.blockContextMenu.removeCommand({
            label: 'Toggle Heading - H5'
        });
        window.roamAlphaAPI.ui.blockContextMenu.removeCommand({
            label: 'Toggle Heading - H6'
        });
    }
}

async function headingsCSS() {
    var cssString = "";
    const regex = /^#.+$/;
    if (h4Tag.match(regex)) {
        h4Tag = h4Tag.replace("#", "");
    }
    if (h5Tag.match(regex)) {
        h5Tag = h5Tag.replace("#", "");
    }
    if (h6Tag.match(regex)) {
        h6Tag = h6Tag.replace("#", "");
    }
    const app = document.querySelector(".roam-body .roam-app");
    const compApp = window.getComputedStyle(app);
    let rrSize = compApp["fontSize"];
    let rrWeight = compApp["fontWeight"];
    let rrStyle = compApp["fontStyle"];
    let rrVar = compApp["fontVariant"];
    cssString += "[data-tag^='" + h4Tag + "'] {display:none;} [data-tag^='" + h4Tag + "'] + .rm-highlight {font-size: " + h4FS + "px; font-weight: " + h4FW + "; font-style: " + h4FSt + "; font-variant: " + h4FV + "; background: unset} ";
    cssString += "[data-tag^='" + h5Tag + "'] {display:none;} [data-tag^='" + h5Tag + "'] + .rm-highlight {font-size: " + h5FS + "px; font-weight: " + h5FW + "; font-style: " + h5FSt + "; font-variant: " + h5FV + "; background: unset} ";
    cssString += "[data-tag^='" + h6Tag + "'] {display:none;} [data-tag^='" + h6Tag + "'] + .rm-highlight {font-size: " + h6FS + "px; font-weight: " + h6FW + "; font-style: " + h6FSt + "; font-variant: " + h6FV + "; background: unset} ";
    cssString += "[data-path-page-links*='" + h4Tag + "'], [data-path-page-links*='" + h5Tag + "'], [data-path-page-links*='" + h6Tag + "'] {font-size: " + rrSize + "; font-weight: " + rrWeight + "; font-style: " + rrStyle + "; font-variant: " + rrVar + ";}";
    var head = document.getElementsByTagName("head")[0]; // remove any existing styles and add updated styles
    if (document.getElementById("headings-css")) {
        var cssStyles = document.getElementById("headings-css");
        head.removeChild(cssStyles);
    }
    var style = document.createElement("style");
    style.id = "headings-css";
    style.textContent = cssString;
    head.appendChild(style);
}

async function toggleHeading(uid, level) {
    let q = `[:find (pull ?page [:node/title :block/string :block/uid :block/heading]) :where [?page :block/uid "${uid}"] ]`;
    var results = await window.roamAlphaAPI.q(q);
    let string = results[0][0].string.toString();
    if (level == "h4") {
        if (string.match(h4Tag)) { // this is turning off the heading
            string = string.replace("#" + h4Tag + "", "");
            string = string.replaceAll("^^", "");
            await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: string.toString(), open: true } });
        } else if (string.match(h5Tag) || string.match(h6Tag)) { // changing heading level
            string = string.replace("#" + h5Tag + "", "");
            string = string.replace("#" + h6Tag + "", "");
            string = string.replaceAll("^^", "");
            var newString = "#" + h4Tag + "^^" + string + "^^";
            await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: newString, open: true } });
        }
        else { // create a new heading
            var newString = "#" + h4Tag + "^^" + string.toString() + "^^";
            await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: newString, open: true } });
        }
    } else if (level == "h5") {
        if (string.match(h5Tag)) { // this is turning off the heading
            string = string.replace("#" + h5Tag + "", "");
            string = string.replaceAll("^^", "");
            await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: string.toString(), open: true } });
        } else if (string.match(h4Tag) || string.match(h6Tag)) { // changing heading level
            string = string.replace("#" + h4Tag + "", "");
            string = string.replace("#" + h6Tag + "", "");
            string = string.replaceAll("^^", "");
            var newString = "#" + h5Tag + "^^" + string + "^^";
            await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: newString, open: true } });
        }
        else { // create a new heading
            var newString = "#" + h5Tag + "^^" + string.toString() + "^^";
            await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: newString, open: true } });
        }
    } else if (level == "h6") {
        if (string.match(h6Tag)) { // this is turning off the heading
            string = string.replace("#" + h6Tag + "", "");
            string = string.replaceAll("^^", "");
            await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: string.toString(), open: true } });
        } else if (string.match(h4Tag) || string.match(h5Tag)) { // changing heading level
            string = string.replace("#" + h4Tag + "", "");
            string = string.replace("#" + h5Tag + "", "");
            string = string.replaceAll("^^", "");
            var newString = "#" + h6Tag + "^^" + string + "^^";
            await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: newString, open: true } });
        }
        else { // create a new heading
            var newString = "#" + h6Tag + "^^" + string.toString() + "^^";
            await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: newString, open: true } });
        }
    }

}