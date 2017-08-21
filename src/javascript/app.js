Ext.define("ts-iteration-editor", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'selector_box'},
        {xtype:'container',itemId:'display_box',defaults: { margin: 10 }}
    ],

    integrationHeaders : {
        name : "ts-iteration-editor"
    },

    launch: function() {
        var timeboxScope = this.getContext().getTimeboxScope();

        if ( !timeboxScope || timeboxScope.type != "iteration" ) {
            this._addSelectors(this.down('#selector_box'));
            return;
        }
        this._updateData(timeboxScope);
    },

    onTimeboxScopeChange: function(timebox) {
        this.down('#display_box').removeAll();
        this._updateData(timebox);
    },

    _addSelectors: function(container) {
        container.add({
            xtype: 'rallyiterationcombobox',
            listeners: {
                scope: this,
                change: this._updateData
            }
        })
    },

    _getIterationFetch: function() {
        return [
            'ObjectID',
            'Name',
            'StartDate',
            'EndDate',
            'c_Goal',
            'c_FistofFive',
            'c_StretchGoal',
            'Notes'
        ];
    },

    _updateData: function(timebox_selector) {
        var display_box = this.down('#display_box'),
            timebox = timebox_selector.getRecord(),
            oid = timebox.get('ObjectID');

        display_box.removeAll();

        var config = {
            model:'Iteration',
            fetch: this._getIterationFetch(),
            context: {
                projectScopeDown: false,
                projectScopeUp: false
            },
            filters:[{property:'ObjectID',value:oid}]
        };

        this._loadWsapiRecords(config).then({
            success: function(results) {
                var iteration = results[0];
                this._displayForm(iteration);
            },
            failure: function(msg) {
                Ext.Msg.alert('',msg);
            },
            scope: this
        });
    },

    _displayForm: function(iteration) {
        var me = this,
            display_box = this.down('#display_box');

        display_box.add({
            xtype:'container',
            html: Ext.String.format("Iteration<br/><br/>{0} ({1}-{2})",
                iteration.get('Name'),
                Rally.util.DateTime.formatWithDefault(iteration.get('StartDate')),
                Rally.util.DateTime.formatWithDefault(iteration.get('EndDate'))
            )
        });

        display_box.add({ xtype:'container', html: "Goal" });
        display_box.add({
            xtype:'rallyrichtexteditor',
            value: iteration.get('c_Goal'),
            field: 'c_Goal',
            listeners: {
                blur: function(editor) { me._updateRecord(iteration,editor)},
                scope: this
            }
        });

        display_box.add({ xtype:'container', html: "Stretch Goal" });
        display_box.add({
            xtype:'rallyrichtexteditor',
            value: iteration.get('c_StretchGoal'),
            field: 'c_StretchGoal',
            listeners: {
                blur: function(editor) { me._updateRecord(iteration,editor)},
                scope: this
            }
        });

        display_box.add({ xtype:'container', html: "Fist of Five" });
        display_box.add({
            xtype:'rallyfieldvaluecombobox',
            value: iteration.get('c_FistofFive'),
            field: 'c_FistofFive',
            model:'Iteration',
            listeners: {
                change: function(editor) { me._updateRecord(iteration,editor)},
                scope: this
            }
        });

        display_box.add({ xtype:'container', html: "Notes" });
        display_box.add({
            xtype:'rallyrichtexteditor',
            value: iteration.get('Notes'),
            field: 'Notes',
            listeners: {
                blur: function(editor) { me._updateRecord(iteration,editor)},
                scope: this
            }
        });

    },

    _updateRecord: function(record,editor) {
        var field = editor.field;
        var value = editor.getValue();
        var fieldname = field;
        if ( field.name ) { fieldname = field.name; }

        this.logger.log('update field ', fieldname);
        if ( record.get(fieldname) == value ) { return; }
        record.set(fieldname,value);
        record.save({
            callback: function(result,operation) {
                if (operation.wasSuccessful() ) {
                    Rally.ui.notify.Notifier.showConfirmation({message: fieldname + " updated"});
                } else {
                    console.log(operation);
                    Rally.ui.notify.Notifier.showWarning({ message: "Failued to update"});
                }
            }
        });
    },

    _loadWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        var default_config = {
            model: 'Defect',
            fetch: ['ObjectID']
        };
        this.logger.log("Starting load:",config.model);
        Ext.create('Rally.data.wsapi.Store', Ext.Object.merge(default_config,config)).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },

    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },

    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },

    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }

});
