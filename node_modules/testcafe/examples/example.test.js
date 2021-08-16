"@fixture A set of examples that illustrate how to use TestCafe API";
"@page http://testcafe.devexpress.com/Example";


//Helpers
function isTransparent() {
    return $('.article-header').css('opacity') === '0';
}


//Tests
'@test'['How to implement typing (act.type user action)'] = {
    '1.Type name': function () {
        act.type('#Developer_Name', 'Peter');
    },

    '2.Replace with last name': function () {
        act.type('#Developer_Name', 'Paker', {replace: true});
    },

    '3.Update last name': function () {
        act.type('#Developer_Name', 'r', {caretPos: 2});
    },

    '4.Check result': function () {
        eq($('#Developer_Name').val(), 'Parker');
    }
};


'@test'['How to click an array of labels and then check their states (act.click user action and ok() assertion)'] = {
    '1.Click two checkbox labels': function () {
        var labels = [
            $(':containsExcludeChildren(Support for testing on remote devices)'),
            $(':containsExcludeChildren(Reusing existing JavaScript code for testing)')
        ];

        act.click(labels);
    },

    '2.Confirm checked state': function () {
        ok($('#testing-on-remote-devices').is(':checked'));
        ok($('#re-using-existing-javascript').is(':checked'));
    }
};


'@test'['How to implement typing, clicking at the specified position and then backspacing the symbol (act.type, act.click, act.press user actions and eq() assertion)'] = {
    '1.Type name': function () {
        act.type('#Developer_Name', 'Peter Parker');
    },

    '2.Move caret position': function () {
        act.click('#Developer_Name', {caretPos: 5});
    },

    '3.Erase a character': function () {
        act.press('backspace');
    },

    '4.Check result': function () {
        eq($('#Developer_Name').val(), 'Pete Parker');
    }
};


'@test'['How to implement pressing specified button (act.press user action)'] = {
    '1.Type name': function () {
        act.type('#Developer_Name', 'Peter Parker');
    },

    '2.Erase Peter': function () {
        act.press('home right . delete delete delete delete');
    },

    '3.Check result': function () {
        eq($('#Developer_Name').val(), 'P. Parker');
    }
};


'@test'['How to implement a comparison (ok() and notOk() assertions)'] = {
    '1.Check comments area is disabled': function () {
        ok($('#Developer_Comments').is(':disabled'));
    },

    '2.Click label "I have tried TestCafe"': function () {
        act.click(':containsExcludeChildren(I have tried TestCafe)');
    },

    '3.Check comments area is enabled': function () {
        notOk($('#Developer_Comments').is(':disabled'));
    }
};


'@test'['How to compare the input value with the specified one (eq() assertion)'] = {
    '1.Type name': function () {
        act.type('#Developer_Name', 'Peter Parker');
    },

    '2.Submit form': function () {
        act.click('.button.blue.fix-width-180');
    },

    '3.Check message': function () {
        eq($('.article-header').html(), 'Thank You, Peter Parker!');
    }
};


'@test'['How to implement dragging (act.drag user action)'] = {
    '1.Click label "I have tried TestCafe"': function () {
        act.click(':containsExcludeChildren(I have tried TestCafe)');
    },

    '2.Check initial slider value': function () {
        eq($('#Developer_Rating').val(), 1);
    },

    '3.Drag slider handle': function () {
        act.drag('.ui-slider-handle', 357, 0, {offsetX: 10, offsetY: 10});
    },

    '4.Check resulting slider value': function () {
        eq($('#Developer_Rating').val(), 7);
    }
};


'@test'['How to implement hovering (act.hover user action)'] = {
    '1.Hover over the combo box': function () {
        act.hover('.text-field');
    },

    '2.Select "Both"': function () {
        var option = $(':containsExcludeChildren(Both)').eq(0);

        act.click(option);
    },

    '3.Check result': function () {
        eq($('.text-field').html(), 'Both');
    }
};


'@test'['How to implement waiting (act.wait user action)'] = {
    '1.Initiate animation and wait': function () {
        $('.article-header').animate({opacity: 0}, 1000);

        act.wait(10000, isTransparent);
    },

    '2.Type': function () {
        act.type('#Developer_Name', 'The wait is over!');
    }
};


'@test'['How to implement selection (act.select user action) '] = {
    '1.Type within “Your name:" input element': function () {
        act.type('#Developer_Name', 'Test Cafe', {caretPos: 0});
    },

    '2.Select within "Your name:" input element': function () {
        act.select('#Developer_Name', 7, 1);
    },

    '3.Confirm input selection state': function () {
        var input = $('#Developer_Name')[0];

        eq(input.selectionStart, 1);
        eq(input.selectionEnd, 7);

        if (input.selectionDirection)
            eq(input.selectionDirection, 'backward');
    }
};

'@test'['How to handle a confirmation dialog (handleConfirm() dialog handling function)'] = {
    '1.Click "Populate"': function () {
        handleConfirm('OK');
        act.click(':containsExcludeChildren(Populate)');
    },

    '2.Click "Submit"': function () {
        this.autoGeneratedName = $('#Developer_Name').val();
        act.click('.button.blue.fix-width-180');
    },

    '3.Check result': function () {
        var header = $('.article-header'),
            expectedResult = 'Thank You, ' + this.autoGeneratedName + '!';

        eq(header.html(), expectedResult);
    }
};

'@test'['A simple test on our example page (act.click, act.type, act.hover user actions and eq() assertion)'] = {
    '1.Click "MacOS"': function () {
        act.click(':containsExcludeChildren(MacOS)');
    },

    '2.Type a name': function () {
        act.type('#Developer_Name', 'Peter Parker', {offsetX: 59, offsetY: 22, caretPos: 0});
    },

    '3.Hover over "Visual recorder"': function () {
        act.hover('.text-field');
    },

    '4.Click "Both"': function () {
        var div = $(':containsExcludeChildren(Both)').eq(0);

        act.click(div, {offsetX: 71, offsetY: 12});
    },

    '5.Click "Submit"': function () {
        var submitButton = $('#submit-button');
        act.click(submitButton, {
            offsetX: 126,
            offsetY: 38
        });
    },

    '6. Check Result': function () {
        eq($('.article-header').html(), 'Thank You, Peter Parker!');
    }

};

