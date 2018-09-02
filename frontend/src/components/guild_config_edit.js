import React, { Component } from 'react';
import AceEditor, { diff as DiffEditor } from 'react-ace';
import {globalState} from '../state';

import 'brace/mode/yaml'
import 'brace/theme/monokai'


export default class GuildConfigEdit extends Component {
  constructor() {
    super();

    this.messageTimer = null;
    this.initialConfig = null;

    this.state = {
      message: null,
      guild: null,
      contents: null,
      hasUnsavedChanges: false,
      history: null,
    }
  }

  componentWillMount() {
    globalState.getGuild(this.props.params.gid).then((guild) => {
      globalState.currentGuild = guild;

      guild.getConfig(true)
      .then((config) => {
        this.initialConfig = config.contents;

        this.setState({
          guild: guild,
          contents: config.contents,
        });
      })
      .then(guild.getConfigHistory())
      .then((history) => {
        console.log("getConfigHistory", history);
        this.setState({
          history: history
        });
      });
    }).catch((err) => {
      console.error('Failed to find guild for config edit', this.props.params.gid);
    });
  }

  componentWillUnmount() {
    globalState.currentGuild = null;
  }

  onEditorChange(newValue) {
    let newState = {contents: newValue, hasUnsavedChanges: false};
    if (this.initialConfig != newValue) {
      newState.hasUnsavedChanges = true;
    }
    this.setState(newState);
  }

  onSave() {
    this.state.guild.putConfig(this.state.contents).then(() => {
      this.initialConfig = this.state.contents;
      this.setState({
        hasUnsavedChanges: false,
      });
      this.renderMessage('success', 'Saved Configuration!');
    }).catch((err) => {
      this.renderMessage('danger', `Failed to save configuration: ${err}`);
    });
  }

  renderMessage(type, contents) {
    this.setState({
      message: {
        type: type,
        contents: contents,
      }
    })

    if (this.messageTimer) clearTimeout(this.messageTimer);

    this.messageTimer = setTimeout(() => {
      this.setState({
        message: null,
      });
      this.messageTimer = null;
    }, 5000);
  }

  render() {
    let history;
    if (this.props.params.timestamp) {
      console.log("props.timestamp", this.props.params.timestamp);
      console.log("state.history", this.state.history);
      history = this.state.history[0]
    }

    return (<div>
      {this.state.message && <div className={"alert alert-" + this.state.message.type}>{this.state.message.contents}</div>}
      <div className="row">
        <div className="col-md-12">
          <div className="panel panel-default">
            <div className="panel-heading">
              <i className="fa fa-gear fa-fw"></i> Configuration Editor
            </div>
            <div className="panel-body">
              { this.state.history && this.props.params.timestamp ? (
                <DiffEditor
                  mode="yaml"
                  theme="monokai"
                  width="100%"
                  height="1000px"
                  value={[history.before, history.after]}
                  readOnly={true}
                />
              ) : (
                <AceEditor
                  mode="yaml"
                  theme="monokai"
                  width="100%"
                  height="1000px"
                  value={this.state.contents == null ? '' : this.state.contents}
                  onChange={(newValue) => this.onEditorChange(newValue)}
                  readOnly={this.state.guild && this.state.guild.role != 'viewer' ? false : true}
                />
              )}
            </div>
            <div className="panel-footer">
              { // check if diff
                this.state.guild && !this.props.params.timestamp && this.state.guild.role != 'viewer' &&
                  <button onClick={() => this.onSave()} type="button" className="btn btn-success btn-circle btn-lg">
                  <i className="fa fa-check"></i>
                </button>
              }
              { this.state.hasUnsavedChanges && <i style={{paddingLeft: '10px'}}>Unsaved Changes!</i>}
            </div>
          </div>
        </div>
      </div>
    </div>);
  }
}
