<template>
  <div id="app">
    <div id="titlebar"><h3>{{title}}</h3></div>
    <div id="content">
      <!-- <img src="./assets/logo.png"> -->
      <Panel title="Test Cases">
        <br/>
        <label>
          Authorization Code<br/>
          <input type="input" v-model="authCode"></input>
        </label>

        <br/>
        <label>
          User ID<br/>
          <input type="input" v-model="userID"></input>
        </label>

        <div v-for="(access, accessKey) in testCases">
          <center><h4 class="accessKey">- {{accessKey}} -</h4></center>
          <div v-for="(testURL, key) in access">
            <TestButton @click.native="doTest(testURL)" class="letter-spaced">{{key}}</TestButton>
          </div>
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


  export default {
    name: 'app',
    components: {TestButton, Panel},
    data () {
      return {
		  authCode: 'sf-dev',
		  userID: '',
          title: 'SF-DEV Console'
      }
    },

    computed: {
        testCases() { return testCases(); }
    },

    methods: {
        doTest(test) {
			traceClear && traceClear();

			const _this = this;
			const testResult = test();

			TweenMax.set($$$.resultsOutput, {alpha: 0});
			$$$.resultsOutput.html('');

			if(!testResult) {
				trace("???");
				return;
			}

			const urlObj = _.isString(testResult) ? {url: testResult} : testResult;

			$.ajax(_.extend(urlObj, {
				//type: 'json',
				beforeSend(xhr) {
					const code = btoa(_this.authCode);
					if(!_.isNullOrEmpty(_this.authCode)) {
						xhr.setRequestHeader('Authorization', code);
					}
				},
				success(result) {
					_this.onResult(result, urlObj.url);
				},
				error(err) { _this.onError(err, urlObj.url); }
            }));
        },

		onResult(result, url) {
			result = JSON.stringify( JSON.parse(result), null, '  ' );
        	//if(_.isObject(result)) result = _.jsonPretty(result);
        	//trace(result);
			showUrlAndMessage(url, 'green', result);
        },

        onError(err, url) {
			const errMessage = `<i class='red'><b>${err.statusText}</b> - ${err.responseText}</i>`;

			showUrlAndMessage(url, 'red-lite', errMessage);
        }
    }
  }

  function showResult(msg) {
	  TweenMax.to($$$.resultsOutput, 0.5, {alpha: 1});

	  $$$.resultsOutput.append(msg + "<br/>");
  }

  function getShortURL(url) {
	  return {
		  url: url,
		  shortURL: 'http://...' + url.substr(url.indexOf('/', 10))
	  };
  }

  function showUrlAndMessage(url, css, msg) {
	  msg = msg.toString();
	  trace(msg);
	  var urlObj = getShortURL(url);
	  showResult(`<i class="${css}"><b>URL:</b> ${urlObj.shortURL}</i>`);
	  showResult(msg.replace(url, urlObj.shortURL));
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
    min-width: 600px;
    min-height: 100%;
    position: relative;

    .output {
      //overflow: ;
      white-space: pre;
      position: absolute;
      display: block;
      @include rect(15px);
      background: #222;
      color: #fff;
      text-shadow: none;
      padding: 5px;
      border: solid 1px #000;
    }
  }

  .accessKey {
    margin-top: 10px;
  }

</style>
