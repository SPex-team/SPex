const run_case_1 = require("./scripts/run_case_console.js")
contracts = await run_case_1.main()
await contracts.spexBeneficiary.pledgeBeneficiaryToSpex(27465,"0x",0,30000000000000000000n,12,"0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",false,0,0)