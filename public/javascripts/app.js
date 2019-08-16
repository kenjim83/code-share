// Requires global jQuery ($) and CodeMirror

const RUN_BUTTON = "#run-button";
const OUTPUT_TEXTAREA = "#code-output";
const PYTHON_EXAMPLE_CODE = "def sayHello():\n  print(\"hello world!\")\n\nsayHello()";
const CODE_MIRROR_ENTRY_ID = "code-mirror-entry";

const app = {
  init() {
    $(RUN_BUTTON)
      .click(this.onRunButtonClick.bind(this));
    $(document)
      .keydown(this.onKeyPress.bind(this))
      .keypress(this.onKeyPress.bind(this));

    this.codeMirror = CodeMirror(document.getElementById(CODE_MIRROR_ENTRY_ID), {
      value: PYTHON_EXAMPLE_CODE,
      lineNumbers: true,
      mode: "text/x-python",
    });
  },

  onRunButtonClick() {
    const rawCode = this.codeMirror.getValue();

    this.sendCodeToServer({ rawCode })
      .then(resp => {
        const output = Array.isArray(resp.output)
          ? resp.output.join("\n")
          : resp.output;
        $(OUTPUT_TEXTAREA).text(output);
      })
      .fail(resp => {
        $(OUTPUT_TEXTAREA).text(resp.responseText);
      })
  },

  onKeyPress(e) {
    if (e.keyCode == 13 && e.shiftKey) {
      this.onRunButtonClick();
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