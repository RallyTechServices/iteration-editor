Ext.define("ts-iteration-editor", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: '10 10 10 10' },
    items: [
        {xtype:'container',itemId:'selector_box'},
        {xtype:'container',itemId:'display_box',defaults: { margin: '0 10 0 10' }}
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

/*
        display_box.add({
            xtype:'container',
            html: Ext.String.format("Iteration<br/><br/>{0} ({1}-{2})",
                iteration.get('Name'),
                Rally.util.DateTime.formatWithDefault(iteration.get('StartDate')),
                Rally.util.DateTime.formatWithDefault(iteration.get('EndDate'))
            )
        });
*/

        display_box.add({ xtype:'container', html: "Goal", cls: 'ts-bold' });

        var goal_box = display_box.add({xtype:'container',itemId:'goal_box'});
        this._setFieldDisplay(goal_box,'c_Goal',iteration);

        display_box.add({ xtype:'container', html: "Stretch Goal", cls: 'ts-bold' });
        var stretch_goal_box = display_box.add({ xtype:'container', itemId: 'stretch_goal_box'});
        this._setFieldDisplay(stretch_goal_box,'c_StretchGoal',iteration);

        display_box.add({ xtype:'container', html: "Fist of Five", cls: 'ts-bold' });
        display_box.add({
            xtype:'rallyfieldvaluecombobox',
            value: iteration.get('c_FistofFive'),
            field: 'c_FistofFive',
            margin: '5 10 20 10',
            model:'Iteration',
            listeners: {
                change: function(editor) { me._updateRecord(iteration,editor)},
                scope: this
            }
        });

        display_box.add({ xtype:'container', html: "Notes", cls: 'ts-bold' });
        var notes_box = display_box.add({ xtype:'container', itemId: 'notes_box'});
        this._setFieldDisplay(notes_box,'Notes',iteration);
    },

    _setFieldDisplay: function(container,fieldname,record) {
        container.removeAll();
        var value = record.get(fieldname);
        if ( Ext.isEmpty(value) ) { value = "<br/>"; }

        container.add({
            xtype:'container',
            html: value,
            field: fieldname,
            cls: 'ts-field-display',
            listeners: {
                element: 'el',
                click: function() {
                    this._setFieldEditor(container,fieldname,record);
                },
                scope: this
            }
        });
    },

    _setFieldEditor: function(container,fieldname,record) {
        container.removeAll();
        container.add({
            xtype:'rallyrichtexteditor',
            value: record.get(fieldname),
            field: fieldname,
            margin: '5 10 20 10',
            listeners: {
                blur: function(editor) {
                    this._updateRecord(record,editor);
                    this._setFieldDisplay(container,fieldname,record);
                },
                scope: this
            }
        }).focus();
    },

    _updateRecord: function(record,editor) {
        var field = editor.field;
        var value = editor.getValue();
        var fieldname = field;
        if ( field.name ) { fieldname = field.name; }

        this.logger.log('update field ', fieldname);
        var old_value = record.get(fieldname);
        value = value.replace(/\<br>/g,"<br \/>");

        if ( old_value == value ) {
            this.logger.log('no change');
            return;
        }

        this.logger.log('changing ', old_value, value);

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
