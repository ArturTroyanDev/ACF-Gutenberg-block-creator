const fs = require("fs-extra");
const path = require("path");

// Create the block structure
function createBlockStructure(blockName) {
  const blockDir = path.join(__dirname, "template-parts", "blocks", blockName);
  const scssDir = path.join(__dirname, "sass", "blocks");
  const globalScssPath = path.join(__dirname, "sass", "blocks", "_blocks.scss");
  const functionsPath = path.join(__dirname, "functions.php");

  if (fs.existsSync(blockDir)) {
    console.log(`Block "${blockName}" already exists at ${blockDir}`);
    return;
  }
  
  // Create directories
  fs.ensureDirSync(blockDir);
  fs.ensureDirSync(scssDir);

  // Create block.json
  const blockJsonContent = {
    name: `acf/${blockName}`,
    title: `${splitWords(blockName)}`,
    description: `${splitWords(blockName)}`,
    category: "Primary",
    icon: "admin-post",
    align: "full",
    keywords: [],
    acf: {
      mode: "edit",
      renderTemplate: `${blockName}.php`,
    },
    example: {
      attributes: {
        mode: "preview",
        data: {
          gutenberg_preview_image: true,
        },
      },
    },
    supports: {
      anchor: true,
      className: true,
    },
  };
  fs.writeJsonSync(path.join(blockDir, "block.json"), blockJsonContent, {
    spaces: 2,
  });

  const phpFileContent = `<?php
  $block_name = str_replace('acf/', '', $block['name']);

  $id = $block_name . '-' . $block['id'];
  if (!empty($block['anchor'])) {
    $id = $block['anchor'];
  }
  
  $class_name = $block_name;
  if (!empty($block['className'])) {
    $class_name .= ' ' . $block['className'];
  }
  
  $title = get_field("title");
  $subtitle = get_field("subtitle");
  $text = get_field("text");
  $background = get_field("background");
  $items = get_field("items");
  $link = get_field("link");

  if (isset($block['data']['gutenberg_preview_image'])) {
    echo '<img src="' . get_stylesheet_directory_uri() . '/template-parts/blocks/' . $block_name . '/' . $block_name . '.png" style="max-width:100%; height:auto;">';
  } else { 
?>

  <section id="<?php echo esc_attr($id); ?>" class="<?php echo esc_attr($class_name); ?> margin_space" >
    <div class="container">

    </div>
  </section>

<?php } ?>`;

  // Create the block PHP file
  fs.writeFileSync(path.join(blockDir, `${blockName}.php`), phpFileContent);

  // Create the _scss file
  fs.writeFileSync(
    path.join(scssDir, `_${blockName}.scss`),
    "",
  );

  // Append import to the _blocks.scss
  const importStatement = `@import "${blockName}/${blockName}";\n`;
  fs.appendFileSync(globalScssPath, importStatement);
  
  const registerLine = `register_block_type(get_template_directory() . '/template-parts/blocks/${blockName}/block.json' );\n`;
  registerBlock(functionsPath, registerLine);

  console.log(`Block structure for "${blockName}" created successfully!`);
}

function registerBlock(functionsPath, registerLine) {
  // register the block in functions.php in my_acf_blocks_init
  if (fs.existsSync(functionsPath)) {
    let fnContent = fs.readFileSync(functionsPath, "utf8");
    const fnStartIdx = fnContent.indexOf("function my_acf_blocks_init");
    
    if (fnStartIdx !== -1 && !fnContent.includes(registerLine.trim())) {
      // find the opening brace of the function
      const openBraceIdx = fnContent.indexOf("{", fnStartIdx);
      // walk the file, counting braces to find the matching closing one
      let depth = 1, i = openBraceIdx + 1;
      while (depth > 0 && i < fnContent.length) {
        if (fnContent[i] === "{") depth++;
        else if (fnContent[i] === "}") depth--;
        i++;
      }
      // `i` is now right after the matching `}`, so insert the line just before it
      const insertPos = i - 1;
      fnContent = fnContent.slice(0, insertPos) + registerLine + fnContent.slice(insertPos);
      fs.writeFileSync(functionsPath, fnContent);
    } else {
      console.log(`my_acf_blocks_init not found or block already registered, skipping functions.php`);
    }
  } else {
    console.log(`functions.php not found at ${functionsPath}, skipping`);
  }
}

// transform blockName(file-name) var to PascalCase(NameExample)
function toPascalCase(fileName) {
  const words = blockName.split("-");
  const arr = words.map((element) => {
    return element[0].toUpperCase() + element.slice(1);
  });
  return `"${arr.join("")}"`
}

function splitWords(fileName) {
  const words = blockName.split("-");
  const arr = words.map((element) => {
    return element[0].toUpperCase() + element.slice(1);
  });
  return arr.join(" ");
}

// Get block name from command line argument
const blockName = process.argv[2];

if (blockName) {
  createBlockStructure(blockName);
} else {
  console.log("Please provide a block name");
}

