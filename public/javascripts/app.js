// Requires global jQuery ($) and CodeMirror

const RUN_BUTTON = "#run-button";
const OUTPUT_TEXTAREA = "#code-output";
const INITIAL_CODE = "def sayHello():\n  print(\"hello world!\")\n\nsayHello()";


const app = {
  init() {
    $(RUN_BUTTON)
      .click(this.onRunButtonClick.bind(this));
    $(document)
      .keydown(this.onKeyPress.bind(this))
      .keypress(this.onKeyPress.bind(this));

    this.codeMirror = CodeMirror(document.getElementById('code-mirror-entry'), {
      value: INITIAL_CODE,
      lineNumbers: true,
      mode: "python",
    });
  },

  onRunButtonClick() {
    const rawCode = this.codeMirror.getValue();

    this.sendCodeToServer({ rawCode })
      .then(resp => {
        $(OUTPUT_TEXTAREA).text(resp.output);
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