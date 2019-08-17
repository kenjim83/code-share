// Requires global jQuery ($) and CodeMirror

const RUN_BUTTON = "#run-button";
const OUTPUT_TEXTAREA = "#code-output";
const PYTHON_EXAMPLE_CODE = "def sayHello():\n  print(\"hello world!\")\n\nsayHello()";
const CODE_MIRROR_ENTRY_ID = "code-mirror-entry";
const DEV_WS_HOST = "ws://localhost:8080";
const PROD_WS_HOST = "wss://codershare.herokuapp.com:8080";
const WS_HOST = window.location.hostname === 'localhost' ? DEV_WS_HOST : PROD_WS_HOST;
const CHANGE_FROM_SET_VALUE = "setValue";

const EXEC_CODE = "XC: "; // Execute code - Run code then update on all clients
const UPDATE_CODE = "UC: "; // Update code - Update code on all clients
const UPDATE_OUTPUT = "UO: "; // Update output - Update executed code output on all clients

const app = {
  init() {
    $(RUN_BUTTON)
      .click(this.onExecuteCode.bind(this));
    $(document)
      .keydown(this.onKeyPress.bind(this))
      .keypress(this.onKeyPress.bind(this));

    this.codeMirror = CodeMirror(document.getElementById(CODE_MIRROR_ENTRY_ID), {
      value: PYTHON_EXAMPLE_CODE,
      lineNumbers: true,
      mode: "python",
    });

    this.$outputTextarea = $(OUTPUT_TEXTAREA);

    this.wsClient = new WebSocket(WS_HOST);

    this.codeMirror.on('change', (instance, { origin }) => {
      if (origin !== CHANGE_FROM_SET_VALUE) {
        const rawCode = instance.getValue();
        this.wsClient.send(UPDATE_CODE + rawCode);
      }
    });

    this.wsClient.onmessage = (messageObj) => {
      const eventCode = messageObj.data.slice(0,4);
      const data = messageObj.data.slice(4);

      if (eventCode === UPDATE_CODE) {
        this.codeMirror.setValue(data);
      }

      if (eventCode === UPDATE_OUTPUT) {
        this.$outputTextarea.text(data);
      }
    }
  },

  onExecuteCode() {
    const rawCode = this.codeMirror.getValue();
    this.wsClient.send(EXEC_CODE + rawCode);
  },

  onKeyPress(e) {
    if (e.keyCode == 13 && e.shiftKey) {
      this.onExecuteCode();
      e.preventDefault();
    }
  },

  sendCodeToServer({ rawCode }){
    return $.ajax({
      url: '/runCode',
      data: { rawCode },
      type: 'POST',
      dataType: 'json',
    });
  },
};


$(document).ready(() => {
  app.init();
});