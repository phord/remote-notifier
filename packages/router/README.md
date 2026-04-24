# Remote Notifier (Router)

> ### Stay informed about progress of your work without having to babysit it!

<p align="center">
  <img src="https://raw.githubusercontent.com/ripper37/remote-notifier/master/assets/example_notification.png" height="146">
</p>

**Remote Notifier** lets you trigger notifications from remote environments like
SSH, Docker or WSL and receive them instantly on your local machine through VS
Code.

Whether you're building your code, running tests, using some tools, or working
with an AI agents, you no longer need to keep checking back or risk missing
anything.

## Remote Notifier (Router)

This is a helper extension ("router") to the main one -
[Remote Notifier](https://marketplace.visualstudio.com/items?itemName=ddyndo.remote-notifier) -
that needs to be installed in a given workspace to allow scripts and tools to
trigger notifications from within that workspace. Triggered notifications are
received by this extension and they are passed to the main extension for
presentation via system (or in-app) notifications to the user.

This extension can be installed manually, but the main extension will also
prompt user to install it whenever new workspace is opened which doesn't have it
installed yet (either local or remote).

### Platform Support

All major platforms (Windows 10+, macOS and Linux) are support.

On Windows, a `code-notify.cmd` script is installed automatically and added to
your PATH to allow triggering notifications.

On Linux/macOS, a `code-notify` bash script is installed automatically and added
to your PATH to allow triggering notifications from that workspace.

## How To Use

1. Install the [main Remote Notifier extension](https://marketplace.visualstudio.com/items?itemName=ddyndo.remote-notifier)
2. Install this helper extension manually or when prompted by the main extension
3. Execute `code-notify` helper script to trigger user notifications! 🎉

You can also find latest version of the extensions on the
[GitHub project page](github.com/RippeR37/remote-notifier/releases) and manually
install VSIX extensions via `Extensions: Install from VSIX...` command available
from the Command Palette (<kbd>F1</kbd>).

> [!IMPORTANT]
> To use Remote Notifier extension in remote workspaces (e.g. via SSH) you need
> to install this Router extension on each remote workspace separately.

Once installed, both extensions will always start automatically.

### More

Find more information by navigating to the
[Remote Notifier extension page](https://marketplace.visualstudio.com/items?itemName=ddyndo.remote-notifier).

## License

[MIT](LICENSE)
