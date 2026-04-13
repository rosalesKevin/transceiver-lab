package netutil

import (
	"fmt"
	"net"

	"github.com/mmt/multicast-tester/internal/model"
)

func ListInterfaces() ([]model.NetworkInterface, error) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil, fmt.Errorf("list interfaces: %w", err)
	}

	var result []model.NetworkInterface
	for _, iface := range ifaces {
		ni := model.NetworkInterface{
			Name:       iface.Name,
			Flags:      iface.Flags.String(),
			IsUp:       iface.Flags&net.FlagUp != 0,
			IsLoopback: iface.Flags&net.FlagLoopback != 0,
		}

		addrs, err := iface.Addrs()
		if err == nil {
			for _, addr := range addrs {
				ni.Addrs = append(ni.Addrs, addr.String())
			}
		}
		if ni.Addrs == nil {
			ni.Addrs = []string{}
		}
		result = append(result, ni)
	}
	return result, nil
}

func FindInterface(name string) (*net.Interface, error) {
	if name == "" {
		return findMulticastInterface()
	}
	iface, err := net.InterfaceByName(name)
	if err != nil {
		return nil, fmt.Errorf("interface %q not found: %w", name, err)
	}
	return iface, nil
}

// findMulticastInterface picks the first non-loopback, multicast-capable, UP interface.
func findMulticastInterface() (*net.Interface, error) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil, err
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 {
			continue
		}
		if iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		if iface.Flags&net.FlagMulticast == 0 {
			continue
		}
		return &iface, nil
	}
	// Fall back to loopback if nothing else works
	for _, iface := range ifaces {
		if iface.Flags&net.FlagLoopback != 0 {
			return &iface, nil
		}
	}
	return nil, fmt.Errorf("no suitable multicast interface found")
}

func ValidateMulticastAddr(addr string) error {
	ip := net.ParseIP(addr)
	if ip == nil {
		return fmt.Errorf("invalid IP address: %s", addr)
	}
	if !ip.IsMulticast() {
		return fmt.Errorf("address %s is not a multicast address (must be in 224.0.0.0/4)", addr)
	}
	return nil
}
