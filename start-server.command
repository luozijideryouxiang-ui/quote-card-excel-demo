#!/bin/zsh
cd "/Users/momo/Desktop/02_财务表格/报价单生成工具/quote-card-excel-demo" || exit 1
exec "/Users/momo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" src/server.mjs
