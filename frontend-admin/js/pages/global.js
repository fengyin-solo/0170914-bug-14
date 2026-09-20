/**
 * 通用知识页面 - 模块化控制器
 * @module GlobalPage
 */
(function (global) {
  'use strict';

  var Utils = App.Utils;
  var Table = App.Table;
  var Modal = App.Modal;
  var Select = App.Select;

  // ====================== 页面状态 ======================
  var state = {
    editingKnowledgeId: null
  };

  // ====================== DOM 元素缓存 ======================
  var elements = {};

  function cacheElements() {
    elements = {
      btnAddKnowledge: document.getElementById('btnAddKnowledge'),
      knowledgeTableBody: document.getElementById('knowledgeTableBody'),
      knowledgeModal: document.getElementById('knowledgeModal'),
      knowledgeModalTitle: document.getElementById('knowledgeModalTitle'),
      formStandardQ: document.getElementById('formStandardQ'),
      formSimilarQ: document.getElementById('formSimilarQ'),
      formAnswer: document.getElementById('formAnswer'),
      knowledgeModalCancel: document.getElementById('knowledgeModalCancel'),
      knowledgeModalSubmit: document.getElementById('knowledgeModalSubmit'),
      blacklistAddSelect: document.getElementById('blacklistAddSelect'),
      btnAddBlacklist: document.getElementById('btnAddBlacklist'),
      blacklistTableBody: document.getElementById('blacklistTableBody'),
      blacklistEmpty: document.getElementById('blacklistEmpty')
    };
  }

  // ====================== 通用知识管理 ======================
  var KnowledgeManager = {
    render: function () {
      var list = MockStore.getGlobalKnowledge();
      
      Table.render(elements.knowledgeTableBody, list, function (k) {
        return '<td class="text-obsidian">' + Utils.escapeHtml(k.standardQ || '') + '</td>' +
          '<td class="text-subtle">' + Utils.escapeHtml((k.similarQs || []).join('；')) + '</td>' +
          '<td class="text-charcoal max-w-xs truncate">' + Utils.escapeHtml(k.answer || '') + '</td>' +
          '<td class="text-right">' +
            '<button type="button" class="btn-link k-edit mr-2" data-id="' + k.id + '">编辑</button>' +
            '<button type="button" class="btn-link btn-link-danger k-delete" data-id="' + k.id + '">删除</button>' +
          '</td>';
      }, this.bindTableEvents.bind(this));
    },

    bindTableEvents: function (tbody) {
      var self = this;
      tbody.querySelectorAll('.k-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          self.openModal(btn.dataset.id);
        });
      });
      tbody.querySelectorAll('.k-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          Confirm.show('确定删除这条知识？', function () {
            MockStore.deleteGlobalKnowledge(btn.dataset.id);
            self.render();
            Toast.show('知识删除成功', 'success');
          });
        });
      });
    },

    openModal: function (id) {
      state.editingKnowledgeId = id || null;
      elements.knowledgeModalTitle.textContent = id ? '编辑知识' : '新增知识';
      
      if (id) {
        var list = MockStore.getGlobalKnowledge();
        var k = list.find(function (x) { return x.id === id; });
        if (k) {
          elements.formStandardQ.value = k.standardQ || '';
          elements.formSimilarQ.value = (k.similarQs || []).join('\n');
          elements.formAnswer.value = k.answer || '';
        }
      } else {
        elements.formStandardQ.value = '';
        elements.formSimilarQ.value = '';
        elements.formAnswer.value = '';
      }
      
      elements.knowledgeModal.style.display = 'flex';
    },

    closeModal: function () {
      elements.knowledgeModal.style.display = 'none';
      state.editingKnowledgeId = null;
    },

    save: function () {
      var standardQ = elements.formStandardQ.value.trim();
      var similarQs = elements.formSimilarQ.value.trim().split(/\n/).map(function (s) {
        return s.trim();
      }).filter(Boolean);
      var answer = elements.formAnswer.value.trim();
      
      if (!standardQ) {
        Toast.show('请填写标准问', 'error');
        return;
      }
      
      if (state.editingKnowledgeId) {
        MockStore.updateGlobalKnowledge(state.editingKnowledgeId, {
          standardQ: standardQ,
          similarQs: similarQs,
          answer: answer
        });
        Toast.show('知识更新成功', 'success');
      } else {
        MockStore.addGlobalKnowledge({
          standardQ: standardQ,
          similarQs: similarQs,
          answer: answer
        });
        Toast.show('知识创建成功', 'success');
      }
      
      this.closeModal();
      this.render();
    }
  };

  // ====================== 黑名单管理 ======================
  var BlacklistManager = {
    fillSelect: function () {
      var merchants = MockStore.getMerchants();
      var blacklist = MockStore.getBlacklist();
      var options = merchants.filter(function (m) {
        return blacklist.indexOf(m.id) === -1;
      }).map(function (m) {
        return { value: m.id, label: m.name + '（' + m.id + '）' };
      });
      Select.fill(elements.blacklistAddSelect, options, '选择商家加入黑名单');
    },

    render: function () {
      var blacklist = MockStore.getBlacklist();
      var merchants = MockStore.getMerchants();
      var map = {};
      merchants.forEach(function (m) { map[m.id] = m.name; });

      // 仅保留当前仍存在的商家，保证黑名单记录与商家列表/下拉选项一致
      var data = blacklist
        .filter(function (id) { return map[id] != null; })
        .map(function (id) {
          return { id: id, name: map[id] };
        });

      if (data.length === 0) {
        elements.blacklistTableBody.innerHTML = '';
        elements.blacklistEmpty.classList.remove('hidden');
        var wrap = elements.blacklistTableBody.closest('.table-wrap');
        if (wrap) wrap.style.display = 'none';
        return;
      }

      elements.blacklistEmpty.classList.add('hidden');
      var wrap = elements.blacklistTableBody.closest('.table-wrap');
      if (wrap) wrap.style.display = '';

      Table.render(elements.blacklistTableBody, data, function (item) {
        return '<td class="font-mono text-sm text-obsidian">' + Utils.escapeHtml(item.id) + '</td>' +
          '<td class="text-obsidian">' + Utils.escapeHtml(item.name) + '</td>' +
          '<td class="text-right">' +
            '<button type="button" class="btn-link bl-remove" data-id="' + item.id + '">移出</button>' +
          '</td>';
      }, this.bindTableEvents.bind(this));
    },

    bindTableEvents: function (tbody) {
      var self = this;
      tbody.querySelectorAll('.bl-remove').forEach(function (btn) {
        btn.addEventListener('click', function () {
          MockStore.removeBlacklist(btn.dataset.id);
          self.render();
          self.fillSelect();
          Toast.show('已从黑名单移出', 'success');
        });
      });
    },

    add: function () {
      var id = elements.blacklistAddSelect.value;
      if (!id) {
        Toast.show('请选择商家', 'error');
        return;
      }
      MockStore.addBlacklist(id);
      this.fillSelect();
      this.render();
      Toast.show('已加入黑名单', 'success');
    }
  };

  // ====================== 事件绑定 ======================
  function bindEvents() {
    elements.btnAddKnowledge.addEventListener('click', function () {
      KnowledgeManager.openModal();
    });
    elements.knowledgeModalCancel.addEventListener('click', function () {
      KnowledgeManager.closeModal();
    });
    elements.knowledgeModalSubmit.addEventListener('click', function () {
      KnowledgeManager.save();
    });
    Modal.bindOverlayClose(elements.knowledgeModal, function () {
      KnowledgeManager.closeModal();
    });

    elements.btnAddBlacklist.addEventListener('click', function () {
      BlacklistManager.add();
    });
  }

  // ====================== 初始化 ======================
  function init() {
    cacheElements();
    bindEvents();
    KnowledgeManager.render();
    BlacklistManager.fillSelect();
    BlacklistManager.render();
  }

  // ====================== 导出模块 ======================
  global.GlobalPage = {
    init: init,
    state: state,
    KnowledgeManager: KnowledgeManager,
    BlacklistManager: BlacklistManager
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
