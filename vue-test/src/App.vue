<template>
  <div id="app">
    <div id="titlebar"><h3>{{title}}</h3></div>
    <div id="content">
      <!-- <img src="./assets/logo.png"> -->
      <Panel title="Test Cases">
        <div v-for="(test, key) in testCases">
          <TestButton @click.native="doTest(test)" class="letter-spaced">api/{{key}}</TestButton>
        </div>
      </Panel>

      <Panel title="Results" class="results">
        <div class="output"></div>
      </Panel>
    </div>
  </div>
</template>

<script>
  import TestButton from './components/TestButton.vue'
  import Panel from './components/Panel.vue'

  const testCases = require('./lib/test-cases');


  $('ready', () => {
	  $$$.resultsOutput = $('.results .output')
  });

  function showResult(msg) {
	  TweenMax.to($$$.resultsOutput, 0.5, {alpha: 1});

	  $$$.resultsOutput.append(msg + "<br/>");
  }

  export default {
    name: 'app',
    components: {TestButton, Panel},
    data () {
      return {
          title: 'SF-DEV Console'
      }
    },

    computed: {
        testCases() { return testCases(); }
    },

    methods: {
        doTest(test) {
			traceClear();

			var _this = this;
			var url = test( this.onResult );

			TweenMax.set($$$.resultsOutput, {alpha: 0});
			$$$.resultsOutput.html('');

			if(_.isString(url)) {
				trace("AJAX: " + url);

				$.ajax({
					url: url,
					success(result) {
						_this.onResult(result, url);
                    },
                    error(err) { _this.onError(err, url); }
                })
            }
        },

		onResult(result, url) {
        	showResult(url);
			showResult(result);
        },

        onError(err, url) {
			const errMessage = `<i class='red'><b>${err.statusText}</b> - ${err.responseText}</i>`;

			showResult(url);
			showResult(errMessage);
        }
    }
  }
</script>

<style lang="scss">

  @import '~scss/styles';
  @import url('https://fonts.googleapis.com/css?family=Ubuntu');

  $titleBarBGColor: #996bc9;
  $titleBarHeight: 50px;
  $contentBGColor: #c8aac2;

  #app {
    font-family: 'Ubuntu', sans-serif;
  }

  #titlebar {
    @include rect();

    height: $titleBarHeight;
    line-height: $titleBarHeight;
    padding: 4px 15px;
    text-shadow: 1px 1px 0px white-alpha(), 0px 0px 16px white-alpha();

    background: grad-5($titleBarBGColor);
  }

  #content {
    @include rect();
    top: $titleBarHeight;
    padding: 10px;
    vertical-align: top;

    .panel {
      vertical-align: top;
      min-height: 200px;
    }

    background: grad-3($contentBGColor, 0, 2, 10);
  }

  .results {
    min-width: 400px;
    min-height: 100%;
    position: relative;

    .output {
      position: absolute;
      display: block;
      @include rect(15px);
      background: #222;
      color: #0f0;
      text-shadow: none;
      padding: 5px;
      border: solid 1px #000;
    }
  }

</style>
