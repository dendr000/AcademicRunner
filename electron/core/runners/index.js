// Copyright (c) dendr000. MIT License.
// 언어별 러너 목록. 러너를 추가하려면 이 목록에만 넣으면 된다.
const java = require('./java')
const python = require('./python')
const javascript = require('./javascript')

const runners = { java, python, javascript }

module.exports = { runners, getRunner: (language) => runners[language] || null }
