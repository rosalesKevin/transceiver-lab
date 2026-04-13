package model

type NetworkInterface struct {
	Name    string   `json:"name"`
	Addrs   []string `json:"addrs"`
	Flags   string   `json:"flags"`
	IsUp    bool     `json:"isUp"`
	IsLoopback bool  `json:"isLoopback"`
}

type NetworkConfig struct {
	MulticastAddr string `json:"multicastAddr"`
	Port          int    `json:"port"`
	InterfaceName string `json:"interfaceName"`
	TTL           int    `json:"ttl"`
	Loopback      bool   `json:"loopback"`
	SourceIP      string `json:"sourceIP,omitempty"` // SSM
}
