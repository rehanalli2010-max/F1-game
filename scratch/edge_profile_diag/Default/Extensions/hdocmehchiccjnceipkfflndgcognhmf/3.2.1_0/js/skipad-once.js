(function () {
  var classList = [
    'videoAdUiSkipButton', // Old close ad button
    'ytp-ad-skip-button ytp-button', // New close ad button
    'ytp-ad-overlay-close-button', // Close overlay button
  ];

  /**
   * Loops over all the class names of buttons that we need to click to skip an
   * ad or overlay, and returns an array of those elements.
   *
   * @param {Array<String>} classNames - an array of class names of buttons that we need to click
   * @returns {Array<Element>} - An array of DOM elements
   */
  function existingButtons(classNames) {
    return classNames
      .map(name => {
        return Array.from(document.getElementsByClassName(name)) || [];
      })
      .reduce(function(acc, elems) {
        return acc.concat(elems);
      }, [])
  }

  /**
   * Loops over all the buttons that need to be clicked and triggers the click
   * even on those buttons.
   */
  function checkAndClickButtons() {
    existingButtons(classList).forEach(button => {
      // We want to make sure that we are only pressing the skip button when it
      // is visible on the screen, so that it is like an actual user is pressing
      // it. This also gives a user time to not-skip the ad in the future.
      triggerClick(button);
    })
  }

  /**
   * Triggers a click event on the given DOM element.
   * 
   * This function is based on an answer here:
   * http://stackoverflow.com/questions/2705583/how-to-simulate-a-click-with-javascript
   * 
   * @param {Element} el - The element on which to trigger the event
   */
  function triggerClick(el) {
    var etype = 'click';

    if (typeof el.fireEvent === 'function') {
      el.fireEvent('on' + etype);
    } else if (typeof el.dispatchEvent === 'function') {
      var evObj = document.createEvent('Events');
      evObj.initEvent(etype, true, false);
      el.dispatchEvent(evObj);
    }
  }

  checkAndClickButtons();
})();