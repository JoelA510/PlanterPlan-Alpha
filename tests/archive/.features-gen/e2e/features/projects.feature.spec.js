// Generated from: e2e/features/projects.feature
import { test } from "playwright-bdd";

test.describe('Project and Task Management', () => {

  test('Creating a new project', async ({ Given, When, Then, And, page }) => { 
    await Given('I am logged in as a normal user', null, { page }); 
    await When('I navigate to the dashboard', null, { page }); 
    await And('I click the "New Project" button', null, { page }); 
    await And('I fill in the project title with "Alpha Release"', null, { page }); 
    await And('I submit the project form', null, { page }); 
    await Then('I should see the project "Alpha Release" on the dashboard', null, { page }); 
    await And('the project status should be "Planning"', null, { page }); 
  });

  test('Adding a task to a project', async ({ Given, When, Then, And, page }) => { 
    await Given('I have a project named "Alpha Release"', null, { page }); 
    await When('I open the project "Alpha Release"', null, { page }); 
    await And('I click "Add Task"', null, { page }); 
    await And('I fill in the task title with "Design Database Schema"', null, { page }); 
    await And('I save the task', null, { page }); 
    await Then('the task "Design Database Schema" should appear in the "To Do" column', null, { page }); 
  });

  test('Moving a task\'s status', async ({ Given, When, Then, page }) => { 
    await Given('I have a task named "Design Database Schema" in "To Do"', null, { page }); 
    await When('I drag the task "Design Database Schema" to the "In Progress" column', null, { page }); 
    await Then('the task status should be updated to "In Progress"', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/projects.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":6,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am logged in as a normal user","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":8,"keywordType":"Action","textWithKeyword":"When I navigate to the dashboard","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"And I click the \"New Project\" button","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"And I fill in the project title with \"Alpha Release\"","stepMatchArguments":[{"group":{"start":33,"value":"\"Alpha Release\"","children":[{"start":34,"value":"Alpha Release","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"And I submit the project form","stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"Then I should see the project \"Alpha Release\" on the dashboard","stepMatchArguments":[{"group":{"start":25,"value":"\"Alpha Release\"","children":[{"start":26,"value":"Alpha Release","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"And the project status should be \"Planning\"","stepMatchArguments":[{"group":{"start":29,"value":"\"Planning\"","children":[{"start":30,"value":"Planning","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":16,"pickleLine":15,"tags":[],"steps":[{"pwStepLine":17,"gherkinStepLine":16,"keywordType":"Context","textWithKeyword":"Given I have a project named \"Alpha Release\"","stepMatchArguments":[{"group":{"start":23,"value":"\"Alpha Release\"","children":[{"start":24,"value":"Alpha Release","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":17,"keywordType":"Action","textWithKeyword":"When I open the project \"Alpha Release\"","stepMatchArguments":[{"group":{"start":19,"value":"\"Alpha Release\"","children":[{"start":20,"value":"Alpha Release","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":19,"gherkinStepLine":18,"keywordType":"Action","textWithKeyword":"And I click \"Add Task\"","stepMatchArguments":[]},{"pwStepLine":20,"gherkinStepLine":19,"keywordType":"Action","textWithKeyword":"And I fill in the task title with \"Design Database Schema\"","stepMatchArguments":[{"group":{"start":30,"value":"\"Design Database Schema\"","children":[{"start":31,"value":"Design Database Schema","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":21,"gherkinStepLine":20,"keywordType":"Action","textWithKeyword":"And I save the task","stepMatchArguments":[]},{"pwStepLine":22,"gherkinStepLine":21,"keywordType":"Outcome","textWithKeyword":"Then the task \"Design Database Schema\" should appear in the \"To Do\" column","stepMatchArguments":[{"group":{"start":9,"value":"\"Design Database Schema\"","children":[{"start":10,"value":"Design Database Schema","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":55,"value":"\"To Do\"","children":[{"start":56,"value":"To Do","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":25,"pickleLine":23,"tags":[],"steps":[{"pwStepLine":26,"gherkinStepLine":24,"keywordType":"Context","textWithKeyword":"Given I have a task named \"Design Database Schema\" in \"To Do\"","stepMatchArguments":[{"group":{"start":20,"value":"\"Design Database Schema\"","children":[{"start":21,"value":"Design Database Schema","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":48,"value":"\"To Do\"","children":[{"start":49,"value":"To Do","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":27,"gherkinStepLine":25,"keywordType":"Action","textWithKeyword":"When I drag the task \"Design Database Schema\" to the \"In Progress\" column","stepMatchArguments":[{"group":{"start":16,"value":"\"Design Database Schema\"","children":[{"start":17,"value":"Design Database Schema","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":48,"value":"\"In Progress\"","children":[{"start":49,"value":"In Progress","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":28,"gherkinStepLine":26,"keywordType":"Outcome","textWithKeyword":"Then the task status should be updated to \"In Progress\"","stepMatchArguments":[{"group":{"start":37,"value":"\"In Progress\"","children":[{"start":38,"value":"In Progress","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end