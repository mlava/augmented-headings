var h4FS, h4FW, h4FSt;
var h5FS, h5FW, h5FSt;
var h6FS, h6FW, h6FSt;
var h4FV, h5FV, h6FV;

export default {
    onload: ({ extensionAPI }) => {
        const config = {
            tabTitle: "Augmented Headings",
            settings: [
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
        h4FS = extensionAPI.settings.get("h4-fontSize");
        h4FW = extensionAPI.settings.get("h4-fontWeight");
        h4FSt = extensionAPI.settings.get("h4-fontStyle");
        h4FV = extensionAPI.settings.get("h4-fontVar");
        h5FS = extensionAPI.settings.get("h5-fontSize");
        h5FW = extensionAPI.settings.get("h5-fontWeight");
        h5FSt = extensionAPI.settings.get("h5-fontStyle");
        h5FV = extensionAPI.settings.get("h5-fontVar");
        h6FS = extensionAPI.settings.get("h6-fontSize");
        h6FW = extensionAPI.settings.get("h6-fontWeight");
        h6FSt = extensionAPI.settings.get("h6-fontStyle");
        h6FV = extensionAPI.settings.get("h6-fontVar");

        // on change in settings
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
    cssString += "[data-tag^='h4'] {display:none !important;} [data-tag^='h4'] + .rm-highlight {font-size: "+h4FS+"px !important; font-weight: "+h4FW+" !important; font-style: "+h4FSt+" !important; font-variant: "+h4FV+" !important; background: unset !important} ";
    cssString += "[data-tag^='h5'] {display:none !important;} [data-tag^='h5'] + .rm-highlight {font-size: "+h5FS+"px !important; font-weight: "+h5FW+" !important; font-style: "+h5FSt+" !important; font-variant: "+h5FV+" !important; background: unset !important} ";
    cssString += "[data-tag^='h6'] {display:none !important;} [data-tag^='h6'] + .rm-highlight {font-size: "+h6FS+"px !important; font-weight: "+h6FW+" !important; font-style: "+h6FSt+" !important; font-variant: "+h6FV+" !important; background: unset !important}";
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

    const regex = /^#(h\d)\^\^(.+)\^\^$/; // check for H4-H6 heading code
    if (regex.test(results[0][0].string.toString())) { // found an existing heading
        const array = [...results[0][0].string.toString().match(regex)]; // get matched groups
        if (array[1] === level) { // this is turning off the heading
            await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: array[2], open: true } });
        } else { // this is changing heading level
            var newString = "#"+level+"^^"+array[2]+"^^";
            await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: newString, open: true } });
        }
    } else { // not a heading, so make it one
        let q = `[:find (pull ?page [:node/title :block/string :block/uid :block/heading]) :where [?page :block/uid "${uid}"] ]`;
        var results = await window.roamAlphaAPI.q(q);
        var newString = "#"+level+"^^"+results[0][0].string.toString()+"^^";
        await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: newString, open: true } });
    }
}