namespace Pcc.Plugins.Uptime;

/// <summary>Singleton that tracks when each target last came up; cleared on transition to down.</summary>
public interface IUptimeTracker
{
    DateTimeOffset? RecordAndGetUpSince(string name, bool up);
}

public sealed class UptimeTracker : IUptimeTracker
{
    private readonly Dictionary<string, DateTimeOffset> _upSince = [];
    private readonly Lock _lock = new();

    public DateTimeOffset? RecordAndGetUpSince(string name, bool up)
    {
        lock (_lock)
        {
            if (up)
            {
                if (!_upSince.ContainsKey(name))
                {
                    _upSince[name] = DateTimeOffset.UtcNow;
                }
                return _upSince[name];
            }

            _upSince.Remove(name);
            return null;
        }
    }
}
