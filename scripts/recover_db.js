const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const BASE_URL = 'https://church-planting.net';
const INDEX_URL = `${BASE_URL}/church-planting-tutorial/`;
const OUTPUT_FILE = path.join(__dirname, '../docs/db/seed_recovery.sql');

// Data Stores
const phases = [];
const milestones = [];
const tasks = [];

// Helper: Clean text
const cleanText = (text) => (text ? text.replace(/\s+/g, ' ').trim() : '');
const escapeSql = (text) => (text ? text.replace(/'/g, "''") : '');

async function main() {
  console.log('Starting DB Recovery Scrape...');

  try {
    // 1. Fetch Index to get Phases (Tutorial Menu)
    console.log(`Fetching index: ${INDEX_URL}`);
    const { data: indexHtml } = await axios.get(INDEX_URL);
    const $index = cheerio.load(indexHtml);

    const phaseLinks = [];
    $index('#menu-tutorial > li').each((i, el) => {
      const $a = $index(el).find('a');
      const title = cleanText($a.text());
      const href = $a.attr('href');

      if (title === 'Tutorial Menu' || title.includes('Final Thoughts')) return;

      phaseLinks.push({ title, href, originalIndex: i });
    });

    console.log(`Found ${phaseLinks.length} potential phases.`);

    const rootProjectId = uuidv4();
    const rootProject = {
      id: rootProjectId,
      parent_task_id: 'NULL',
      title: 'Recovered Project',
      description: 'Imported from Church Planting Tutorial',
      origin: 'template',
      root_id: rootProjectId,
      position: 0,
    };

    // 2. Iterate Phases
    let phasePosition = 0;
    for (const link of phaseLinks) {
      if (!link.href || link.href === '#') continue;

      const phaseId = uuidv4();
      phasePosition += 1000;
      phases.push({
        id: phaseId,
        parent_task_id: rootProjectId,
        title: link.title,
        description: `Imported from ${link.href}`,
        origin: 'template',
        root_id: rootProjectId,
        position: phasePosition,
      });

      console.log(`Processing Phase: ${link.title} (${link.href})`);

      try {
        const { data: pageHtml } = await axios.get(link.href);
        const $page = cheerio.load(pageHtml);
        const $content = $page('#article');

        let currentMilestoneId = null;
        let milestonePosition = 0;
        let taskPosition = 0;

        // Iterate over children of content area to preserve order
        $content.children().each((i, el) => {
          const tagName = el.tagName.toLowerCase();
          const $el = $page(el);
          const text = cleanText($el.text());

          // Skip navigation/empty
          if (
            !text ||
            text === 'Tutorial Menu' ||
            $el.hasClass('sharedaddy') ||
            $el.hasClass('tutorial-nav') ||
            $el.find('#menu-tutorial').length > 0
          )
            return;

          // Headers start a new Milestone
          if (['h1', 'h2', 'h3', 'h4'].includes(tagName)) {
            // Start new milestone
            currentMilestoneId = uuidv4();
            milestonePosition += 1000;
            taskPosition = 0; // Reset task position for new milestone

            milestones.push({
              id: currentMilestoneId,
              parent_task_id: phaseId,
              title: text,
              description: '',
              origin: 'template',
              root_id: rootProjectId,
              position: milestonePosition,
            });
          }
          // Lists are collections of Tasks
          else if (tagName === 'ul' || tagName === 'ol') {
            if ($el.attr('id') === 'menu-tutorial' || $el.hasClass('tutorial-nav')) return;

            if (!currentMilestoneId) {
              currentMilestoneId = uuidv4();
              milestonePosition += 1000;
              milestones.push({
                id: currentMilestoneId,
                parent_task_id: phaseId,
                title: 'General',
                description: 'Auto-generated container for initial tasks',
                origin: 'template',
                root_id: rootProjectId,
                position: milestonePosition,
              });
            }

            const listItems = $el.find('li');
            listItems.each((j, li) => {
              const $li = $page(li);
              const liText = cleanText($li.text());

              // Check for links in LI for resource mapping
              let resourceUrl = null;
              let resourceType = null;
              const $link = $li.find('a');
              if ($link.length > 0) {
                const href = $link.attr('href');
                if (href && !href.startsWith('#')) {
                  resourceUrl = href;
                  if (href.includes('/download/') || href.endsWith('.pdf')) {
                    resourceType = 'pdf';
                  } else {
                    resourceType = 'url';
                  }
                }
              }

              if (liText) {
                taskPosition += 1000;
                tasks.push({
                  id: uuidv4(),
                  parent_task_id: currentMilestoneId,
                  title: liText.substring(0, 255),
                  description: liText.length > 255 ? liText : '',
                  origin: 'template',
                  root_id: rootProjectId,
                  position: taskPosition,
                  resource_type: resourceType,
                  resource_url: resourceUrl,
                });
              }
            });
          }
          // Paragraphs
          else if (tagName === 'p') {
            if (currentMilestoneId) {
              const mIndex = milestones.findIndex((m) => m.id === currentMilestoneId);

              // Check if P contains a resource link (like "Download File")
              const $link = $el.find('a');
              if ($link.length > 0) {
                const href = $link.attr('href');
                const linkText = cleanText($link.text());

                // Heuristic: If paragraphs is short and mostly a link, treat as Resource Task
                // OR if it's a "Download File" link.
                if (href && (href.includes('/download/') || text.length < 100)) {
                  taskPosition += 1000;
                  let rType = 'url';
                  if (href.includes('/download/') || href.endsWith('.pdf')) rType = 'pdf';

                  // Better title for download links
                  let tTitle = text;
                  // If title is just "Download File...", maybe try to make it more descriptive or just leave it.
                  // Ideally we'd use the Milestone title, but we can't easily rename the milestone now.

                  tasks.push({
                    id: uuidv4(),
                    parent_task_id: currentMilestoneId,
                    title: tTitle.substring(0, 255),
                    description: '',
                    origin: 'template',
                    root_id: rootProjectId,
                    position: taskPosition,
                    resource_type: rType,
                    resource_url: href,
                  });
                  return; // Handled as task, don't append to description
                }
              }

              // Otherwise append to description
              if (mIndex >= 0 && milestones[mIndex].description.length < 1000) {
                milestones[mIndex].description += '\n' + text;
              }
            }
          }
        });
      } catch (err) {
        console.error(`Failed to scrape ${link.href}: ${err.message}`);
      }
    }

    // 3. Generate SQL
    console.log(
      `Generating SQL for ${1 + phases.length + milestones.length + tasks.length} records...`
    );

    // Helper for INSERTs
    const generateInserts = (items, label) => {
      let s = '';
      if (items.length > 0) {
        s += `-- ${label}\n`;
        const chunkSize = 500;
        for (let i = 0; i < items.length; i += chunkSize) {
          const chunk = items.slice(i, i + chunkSize);
          s += `INSERT INTO public.tasks (id, parent_task_id, title, description, origin, root_id, position, resource_type, resource_url) VALUES \n`;
          s +=
            chunk
              .map((t) => {
                const rType = t.resource_type ? `'${t.resource_type}'` : 'NULL';
                const rUrl = t.resource_url ? `'${t.resource_url}'` : 'NULL';
                const pId = t.parent_task_id === 'NULL' ? 'NULL' : `'${t.parent_task_id}'`;
                return `('${t.id}', ${pId}, '${escapeSql(t.title)}', '${escapeSql(t.description)}', '${t.origin}', '${t.root_id}', ${t.position || 0}, ${rType}, ${rUrl})`;
              })
              .join(',\n') + ';\n';
        }
        s += '\n';
      }
      return s;
    };

    let sql = `-- Auto-generated Seed Recovery File\n`;
    sql += `-- Generated at: ${new Date().toISOString()}\n`;
    sql += `BEGIN;\n\n`;

    // Root Project
    sql += generateInserts([rootProject], 'Root Project');
    sql += generateInserts(phases, 'Phases');
    sql += generateInserts(milestones, 'Milestones');
    sql += generateInserts(tasks, 'Tasks');

    sql += `\nCOMMIT;\n`;

    fs.writeFileSync(OUTPUT_FILE, sql);
    console.log(`Success! Saved to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('Fatal Error:', err);
  }
}

main();
